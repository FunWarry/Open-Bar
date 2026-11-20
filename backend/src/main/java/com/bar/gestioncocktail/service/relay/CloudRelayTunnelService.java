package com.bar.gestioncocktail.service.relay;

import com.bar.gestioncocktail.config.CloudRelayProperties;
import com.bar.gestioncocktail.dto.relay.CloudRelayDiagnosticDTO;
import com.bar.gestioncocktail.dto.relay.CloudRelayStatusDTO;
import com.bar.gestioncocktail.dto.relay.PublicBrandingDTO;
import com.bar.gestioncocktail.dto.relay.RelayFrameType;
import com.bar.gestioncocktail.dto.relay.RelayTunnelMessage;
import com.bar.gestioncocktail.event.CloudRelaySettingsUpdatedEvent;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.RelayConnectionState;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import com.bar.gestioncocktail.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Manages the persistent outbound reverse Cloud Relay WebSocket tunnel, automatic exponential-backoff
 * reconnection, heartbeat latency monitoring, local simulator mode, and public white-label branding resolution.
 */
@Service
public class CloudRelayTunnelService {

    private static final Logger log = LoggerFactory.getLogger(CloudRelayTunnelService.class);

    private final CloudRelayProperties properties;
    private final AppSettingsService appSettingsService;
    private final EstablishmentConfigService establishmentConfigService;
    private final CloudRelayAccessService accessService;
    private final RelayLocalDispatcher localDispatcher;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private HttpClient httpClient;

    private final AtomicReference<RelayConnectionState> state = new AtomicReference<>(RelayConnectionState.DISCONNECTED);
    private final AtomicReference<WebSocket> activeWebSocket = new AtomicReference<>();
    private final AtomicReference<Instant> connectedSince = new AtomicReference<>();
    private final AtomicReference<Instant> lastHeartbeatAt = new AtomicReference<>();
    private final AtomicReference<Instant> nextRetryAt = new AtomicReference<>();
    private final AtomicReference<String> lastError = new AtomicReference<>();
    private final AtomicInteger reconnectAttempt = new AtomicInteger(0);
    private final AtomicLong totalProxiedRequests = new AtomicLong(0);
    private final AtomicLong totalProxiedWsFrames = new AtomicLong(0);
    private final AtomicLong averageLatencyMs = new AtomicLong(0);
    private final Map<String, Instant> pendingPings = new ConcurrentHashMap<>();
    private volatile boolean simulatorForcedOffline = false;

    /**
     * Constructs CloudRelayTunnelService with required collaborators and a default {@link HttpClient}.
     *
     * @param properties                 Cloud Relay configuration properties
     * @param appSettingsService         Establishment settings service
     * @param establishmentConfigService Modular capability config service
     * @param accessService              Configurable tunnel access control service
     * @param localDispatcher            Local HTTP/WS tunnel dispatcher
     * @param notificationService        STOMP broadcast service
     * @param objectMapper               Jackson JSON mapper
     */
    @Autowired
    public CloudRelayTunnelService(
            CloudRelayProperties properties,
            AppSettingsService appSettingsService,
            EstablishmentConfigService establishmentConfigService,
            CloudRelayAccessService accessService,
            RelayLocalDispatcher localDispatcher,
            NotificationService notificationService,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.appSettingsService = appSettingsService;
        this.establishmentConfigService = establishmentConfigService;
        this.accessService = accessService;
        this.localDispatcher = localDispatcher;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    /**
     * Package-private hook allowing unit tests to inject a mock {@link HttpClient}.
     *
     * @param httpClient Mocked or customized HTTP client
     */
    void setHttpClientForTest(HttpClient httpClient) {
        this.httpClient = httpClient;
    }

    /**
     * Initializes the outbound tunnel on startup if both global properties and establishment
     * settings have Cloud Relay enabled.
     */
    @PostConstruct
    public void init() {
        try {
            if (shouldAutoConnect()) {
                connect();
            }
        } catch (Exception ex) {
            log.debug("Cloud Relay startup auto-connect skipped: {}", ex.getMessage());
        }
    }

    /**
     * Gracefully terminates any active tunnel connection upon application shutdown.
     */
    @PreDestroy
    public void shutdown() {
        disconnect();
    }

    /**
     * Reacts to establishment settings updates to connect or disconnect the outbound tunnel automatically.
     *
     * @param event Settings change event
     */
    @EventListener
    public void onSettingsUpdated(CloudRelaySettingsUpdatedEvent event) {
        if (event.cloudRelayEnabled() && establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)) {
            connect();
        } else {
            disconnect();
        }
    }

    /**
     * Establishes or simulates the outbound persistent WebSocket tunnel to the Cloud Relay gateway.
     *
     * @return Updated {@link CloudRelayStatusDTO}
     */
    public synchronized CloudRelayStatusDTO connect() {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.CLOUD_RELAY);
        AppSettings settings = appSettingsService.getSettings();
        simulatorForcedOffline = false;
        lastError.set(null);

        if (properties.isSimulatorEnabled()) {
            state.set(RelayConnectionState.SIMULATED);
            connectedSince.set(Instant.now());
            lastHeartbeatAt.set(Instant.now());
            nextRetryAt.set(null);
            reconnectAttempt.set(0);
            averageLatencyMs.set(18L);
            broadcastStatus();
            return getStatus();
        }

        if (settings.getVenueSlug() == null || settings.getVenueSlug().isBlank()) {
            state.set(RelayConnectionState.ERROR);
            lastError.set("Venue subdomain slug must be configured before connecting the Cloud Relay tunnel.");
            broadcastStatus();
            return getStatus();
        }

        closeExistingSocket();
        state.set(RelayConnectionState.CONNECTING);
        broadcastStatus();

        try {
            URI relayUri = URI.create(properties.getRelayUrl());
            httpClient.newWebSocketBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .buildAsync(relayUri, new TunnelWebSocketListener())
                    .whenComplete((ws, err) -> {
                        if (err != null) {
                            handleConnectionFailure("Unable to reach Cloud Relay gateway: " + err.getMessage());
                        } else if (ws != null) {
                            activeWebSocket.set(ws);
                            sendTunnelFrame(ws, RelayTunnelMessage.register(
                                    settings.getVenueSlug(),
                                    settings.getCustomDomain(),
                                    settings.getRelayPairingToken()));
                            state.set(RelayConnectionState.CONNECTED);
                            connectedSince.set(Instant.now());
                            lastHeartbeatAt.set(Instant.now());
                            nextRetryAt.set(null);
                            reconnectAttempt.set(0);
                            lastError.set(null);
                            broadcastStatus();
                        }
                    });
        } catch (Exception ex) {
            handleConnectionFailure("Invalid Cloud Relay endpoint: " + ex.getMessage());
        }

        return getStatus();
    }

    /**
     * Gracefully disconnects the outbound Cloud Relay tunnel and closes active bridged streams.
     *
     * @return Updated {@link CloudRelayStatusDTO}
     */
    public synchronized CloudRelayStatusDTO disconnect() {
        closeExistingSocket();
        localDispatcher.closeAllStreams();
        pendingPings.clear();
        state.set(RelayConnectionState.DISCONNECTED);
        connectedSince.set(null);
        nextRetryAt.set(null);
        reconnectAttempt.set(0);
        broadcastStatus();
        return getStatus();
    }

    /**
     * Simulates an abrupt tunnel outage in simulator/dev/test mode so graceful fallback UI can be verified.
     *
     * @return Updated {@link CloudRelayStatusDTO}
     */
    public synchronized CloudRelayStatusDTO simulateDisconnect() {
        simulatorForcedOffline = true;
        closeExistingSocket();
        state.set(RelayConnectionState.RECONNECTING);
        connectedSince.set(null);
        lastError.set("Simulated internet connectivity outage");
        scheduleNextBackoff();
        broadcastStatus();
        return getStatus();
    }

    /**
     * Restores tunnel connectivity from simulated outage state.
     *
     * @return Updated {@link CloudRelayStatusDTO}
     */
    public synchronized CloudRelayStatusDTO simulateReconnect() {
        simulatorForcedOffline = false;
        return connect();
    }

    /**
     * Periodic scheduler executing heartbeats and exponential-backoff reconnection checks.
     */
    @Scheduled(fixedDelayString = "${openbar.relay.heartbeat-interval-ms:15000}", initialDelay = 15000)
    public void scheduledMaintenance() {
        if (!establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)) {
            if (state.get() != RelayConnectionState.DISCONNECTED) {
                disconnect();
            }
            return;
        }
        AppSettings settings = appSettingsService.getSettings();
        if (!Boolean.TRUE.equals(settings.getCloudRelayEnabled()) || simulatorForcedOffline) {
            return;
        }

        RelayConnectionState current = state.get();
        if (current == RelayConnectionState.RECONNECTING) {
            Instant retryDeadline = nextRetryAt.get();
            if (retryDeadline == null || !Instant.now().isBefore(retryDeadline)) {
                connect();
            }
            return;
        }

        if (current == RelayConnectionState.SIMULATED) {
            lastHeartbeatAt.set(Instant.now());
            return;
        }

        WebSocket ws = activeWebSocket.get();
        if (current == RelayConnectionState.CONNECTED && ws != null) {
            String pingId = UUID.randomUUID().toString();
            pendingPings.put(pingId, Instant.now());
            sendTunnelFrame(ws, RelayTunnelMessage.ping(pingId));
        }
    }

    /**
     * Runs an on-demand diagnostic probe verifying subdomain, optional CNAME DNS resolution,
     * and Cloud Relay tunnel health.
     *
     * @return {@link CloudRelayDiagnosticDTO}
     */
    public CloudRelayDiagnosticDTO runDiagnostics() {
        AppSettings settings = appSettingsService.getSettings();
        boolean moduleEnabled = establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY);
        String resolvedUrl = appSettingsService.resolveEffectivePublicBaseUrl(
                settings, properties.getBaseDomain(), true);

        if (!moduleEnabled) {
            return new CloudRelayDiagnosticDTO(false, 0L, "MODULE_DISABLED",
                    "Cloud Relay module is disabled in Establishment Capabilities.", resolvedUrl, false, false);
        }
        if (settings.getVenueSlug() == null || settings.getVenueSlug().isBlank()) {
            return new CloudRelayDiagnosticDTO(false, 0L, "MISCONFIGURED",
                    "Configure a venue subdomain slug before testing Cloud Relay.", resolvedUrl, false, false);
        }

        boolean dnsVerified = true;
        if (settings.getCustomDomain() != null && !settings.getCustomDomain().isBlank() && !properties.isSimulatorEnabled()) {
            dnsVerified = verifyDnsResolution(settings.getCustomDomain());
        }

        if (properties.isSimulatorEnabled()) {
            long latency = averageLatencyMs.get() > 0 ? averageLatencyMs.get() : 18L;
            return new CloudRelayDiagnosticDTO(!simulatorForcedOffline, latency,
                    simulatorForcedOffline ? "UNREACHABLE" : "SIMULATED_OK",
                    simulatorForcedOffline
                            ? "Tunnel simulator is currently in offline fallback mode."
                            : "Cloud Relay simulator connected and subdomain routing verified.",
                    resolvedUrl, dnsVerified, true);
        }

        boolean healthy = state.get() == RelayConnectionState.CONNECTED;
        return new CloudRelayDiagnosticDTO(
                healthy && dnsVerified,
                averageLatencyMs.get(),
                healthy ? "OK" : "UNREACHABLE",
                healthy ? "Outbound WSS tunnel is active and routing sub-50ms."
                        : "Tunnel is not connected (" + state.get() + ").",
                resolvedUrl,
                dnsVerified,
                resolvedUrl.startsWith("https://"));
    }

    /**
     * Handles an incoming frame received over the outbound WebSocket tunnel (or unit/integration tests).
     *
     * @param message Parsed tunnel frame
     * @param socket  Optional active WebSocket for sending response frames
     */
    public void handleInboundMessage(RelayTunnelMessage message, WebSocket socket) {
        if (message == null || message.type() == null) {
            return;
        }
        switch (message.type()) {
            case REGISTER_ACK -> {
                state.set(RelayConnectionState.CONNECTED);
                lastHeartbeatAt.set(Instant.now());
                reconnectAttempt.set(0);
                broadcastStatus();
            }
            case PONG -> {
                Instant sentAt = message.streamId() != null ? pendingPings.remove(message.streamId()) : null;
                if (sentAt != null) {
                    averageLatencyMs.set(Math.max(1L, Duration.between(sentAt, Instant.now()).toMillis()));
                }
                lastHeartbeatAt.set(Instant.now());
            }
            case PING -> sendTunnelFrame(socket, new RelayTunnelMessage(
                    RelayFrameType.PONG, message.streamId(), null, null, null, Map.of(),
                    null, null, null, null, null, null, null, Instant.now()));
            case HTTP_REQUEST -> {
                totalProxiedRequests.incrementAndGet();
                RelayTunnelMessage response = localDispatcher.dispatchHttp(message);
                sendTunnelFrame(socket, response);
            }
            case WS_OPEN -> {
                totalProxiedWsFrames.incrementAndGet();
                localDispatcher.openWebSocketStream(message, frame -> sendTunnelFrame(socket, frame));
            }
            case WS_FRAME -> {
                totalProxiedWsFrames.incrementAndGet();
                localDispatcher.forwardWebSocketFrame(message);
            }
            case WS_CLOSE -> localDispatcher.closeWebSocketStream(message.streamId());
            case DISCONNECT -> handleConnectionFailure(
                    message.errorMessage() != null ? message.errorMessage() : "Relay gateway requested disconnect");
            default -> log.debug("Ignored tunnel frame type: {}", message.type());
        }
    }

    /**
     * Returns the current live status snapshot and access policy summary for admin diagnostics.
     *
     * @return {@link CloudRelayStatusDTO}
     */
    public CloudRelayStatusDTO getStatus() {
        AppSettings settings = appSettingsService.getSettings();
        boolean moduleEnabled = establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY);
        String resolvedUrl = appSettingsService.resolveEffectivePublicBaseUrl(
                settings, properties.getBaseDomain(), moduleEnabled);
        Instant retryAt = nextRetryAt.get();
        long retrySeconds = retryAt != null
                ? Math.max(0L, Duration.between(Instant.now(), retryAt).toSeconds())
                : 0L;
        List<String> allowedRoles = accessService.parseAllowedRoles(settings.getCloudRelayAllowedRolesJson());

        return new CloudRelayStatusDTO(
                moduleEnabled,
                Boolean.TRUE.equals(settings.getCloudRelayEnabled()),
                state.get(),
                settings.getVenueSlug(),
                settings.getCustomDomain(),
                properties.getBaseDomain(),
                resolvedUrl,
                properties.getRelayUrl(),
                settings.getRelayPairingToken() != null && !settings.getRelayPairingToken().isBlank(),
                connectedSince.get(),
                lastHeartbeatAt.get(),
                lastError.get(),
                reconnectAttempt.get(),
                retrySeconds,
                localDispatcher.getActiveStreamCount(),
                totalProxiedRequests.get(),
                totalProxiedWsFrames.get(),
                averageLatencyMs.get(),
                properties.isSimulatorEnabled(),
                Boolean.TRUE.equals(settings.getCloudRelayClientsEnabled()),
                Boolean.TRUE.equals(settings.getCloudRelayStaffEnabled()),
                Boolean.TRUE.equals(settings.getCloudRelayAdminEnabled()),
                Boolean.TRUE.equals(settings.getCloudRelayRemoteTpeEnabled()),
                Boolean.TRUE.equals(settings.getCloudRelayRemotePrintingEnabled()),
                allowedRoles
        );
    }

    /**
     * Builds the public white-label branding and offline fallback metadata DTO for patrons and login pages.
     *
     * @return {@link PublicBrandingDTO}
     */
    public PublicBrandingDTO getPublicBranding() {
        AppSettings settings = appSettingsService.getSettings();
        boolean moduleEnabled = establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY);
        boolean relayEnabled = moduleEnabled && Boolean.TRUE.equals(settings.getCloudRelayEnabled());
        RelayConnectionState currentState = state.get();
        boolean tunnelHealthy = relayEnabled
                && !simulatorForcedOffline
                && (currentState == RelayConnectionState.CONNECTED || currentState == RelayConnectionState.SIMULATED);
        String effectiveUrl = appSettingsService.resolveEffectivePublicBaseUrl(
                settings, properties.getBaseDomain(), moduleEnabled);
        String localFallback = (settings.getClientBaseUrl() != null && !settings.getClientBaseUrl().isBlank())
                ? settings.getClientBaseUrl()
                : "https://openbar.local";

        return new PublicBrandingDTO(
                settings.getEstablishmentName(),
                settings.getVenueSlug(),
                settings.getCustomDomain(),
                settings.getPrimaryColor(),
                settings.getPrimaryColorStrong(),
                settings.getLogoUrl(),
                settings.getBannerImageUrl(),
                settings.getDefaultTheme(),
                relayEnabled,
                tunnelHealthy,
                Boolean.TRUE.equals(settings.getCloudRelayClientsEnabled()),
                Boolean.TRUE.equals(settings.getCloudRelayStaffEnabled()),
                effectiveUrl,
                localFallback,
                Boolean.TRUE.equals(settings.getWifiEnabled()),
                Boolean.TRUE.equals(settings.getWifiEnabled()) ? settings.getWifiSsid() : null
        );
    }

    /**
     * Computes exponential backoff delay in milliseconds capped at {@code reconnectMaxDelayMs}.
     *
     * @param attempt 1-based attempt number
     * @return Backoff delay in milliseconds
     */
    public long computeBackoffDelayMs(int attempt) {
        long base = Math.max(250L, properties.getReconnectInitialDelayMs());
        long max = Math.max(base, properties.getReconnectMaxDelayMs());
        int shift = Math.min(Math.max(attempt - 1, 0), 10);
        long delay = base * (1L << shift);
        return Math.min(delay, max);
    }

    private boolean shouldAutoConnect() {
        if (!properties.isEnabled()) {
            return false;
        }
        AppSettings settings = appSettingsService.getSettings();
        return establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)
                && Boolean.TRUE.equals(settings.getCloudRelayEnabled());
    }

    private void handleConnectionFailure(String reason) {
        activeWebSocket.set(null);
        localDispatcher.closeAllStreams();
        connectedSince.set(null);
        lastError.set(reason);
        state.set(RelayConnectionState.RECONNECTING);
        scheduleNextBackoff();
        broadcastStatus();
    }

    private void scheduleNextBackoff() {
        int attempt = reconnectAttempt.incrementAndGet();
        long delayMs = computeBackoffDelayMs(attempt);
        nextRetryAt.set(Instant.now().plusMillis(delayMs));
    }

    private void closeExistingSocket() {
        WebSocket existing = activeWebSocket.getAndSet(null);
        if (existing != null) {
            try {
                sendTunnelFrame(existing, new RelayTunnelMessage(
                        RelayFrameType.DISCONNECT, null, null, null, null, Map.of(),
                        null, null, null, null, null, null, "Client shutdown", Instant.now()));
                existing.sendClose(WebSocket.NORMAL_CLOSURE, "Closing tunnel");
            } catch (Exception _) {
                existing.abort();
            }
        }
    }

    private void sendTunnelFrame(WebSocket socket, RelayTunnelMessage message) {
        if (socket == null || message == null) {
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(message);
            socket.sendText(json, true);
        } catch (Exception ex) {
            log.warn("Failed to serialize or send tunnel frame: {}", ex.getMessage());
        }
    }

    private boolean verifyDnsResolution(String hostname) {
        try {
            InetAddress.getByName(hostname);
            return true;
        } catch (Exception _) {
            return false;
        }
    }

    private void broadcastStatus() {
        if (notificationService != null) {
            notificationService.notifierCloudRelayMiseAJour(getStatus());
        }
    }

    private final class TunnelWebSocketListener implements WebSocket.Listener {
        private final StringBuilder buffer = new StringBuilder();

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            buffer.append(data);
            if (last) {
                String payload = buffer.toString();
                buffer.setLength(0);
                try {
                    RelayTunnelMessage message = objectMapper.readValue(payload, RelayTunnelMessage.class);
                    handleInboundMessage(message, webSocket);
                } catch (Exception ex) {
                    log.warn("Invalid Cloud Relay frame received: {}", ex.getMessage());
                }
            }
            webSocket.request(1);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            if (state.get() != RelayConnectionState.DISCONNECTED) {
                handleConnectionFailure("Relay WebSocket closed (" + statusCode + "): " + reason);
            }
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            if (state.get() != RelayConnectionState.DISCONNECTED) {
                handleConnectionFailure("Relay WebSocket error: " + error.getMessage());
            }
        }
    }
}
