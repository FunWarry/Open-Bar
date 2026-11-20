package com.bar.gestioncocktail.service.relay;

import com.bar.gestioncocktail.config.CloudRelayProperties;
import com.bar.gestioncocktail.dto.relay.CloudRelayDiagnosticDTO;
import com.bar.gestioncocktail.dto.relay.CloudRelayStatusDTO;
import com.bar.gestioncocktail.dto.relay.PublicBrandingDTO;
import com.bar.gestioncocktail.dto.relay.RelayFrameType;
import com.bar.gestioncocktail.dto.relay.RelayTunnelMessage;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.RelayConnectionState;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import com.bar.gestioncocktail.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link CloudRelayTunnelService} verifying simulator connectivity,
 * outage simulation, backoff calculation, diagnostic probes, frame dispatching, and branding.
 */
@ExtendWith(MockitoExtension.class)
class CloudRelayTunnelServiceTest {

    @Mock
    private AppSettingsService appSettingsService;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private CloudRelayAccessService accessService;

    @Mock
    private RelayLocalDispatcher localDispatcher;

    @Mock
    private NotificationService notificationService;

    @Mock
    private HttpClient httpClient;

    @Mock
    private WebSocket mockSocket;

    private CloudRelayProperties properties;
    private CloudRelayTunnelService tunnelService;
    private AppSettings settings;

    @BeforeEach
    void setUp() {
        properties = new CloudRelayProperties();
        properties.setBaseDomain("open-bar.eu");
        properties.setSimulatorEnabled(true);
        properties.setReconnectInitialDelayMs(1000L);
        properties.setReconnectMaxDelayMs(32000L);

        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        tunnelService = new CloudRelayTunnelService(
                properties,
                appSettingsService,
                establishmentConfigService,
                accessService,
                localDispatcher,
                notificationService,
                mapper);
        tunnelService.setHttpClientForTest(httpClient);

        settings = new AppSettings();
        settings.setEstablishmentName("Le Shaker Paris");
        settings.setVenueSlug("le-shaker-paris");
        settings.setBannerImageUrl("https://cdn.example.com/banner.jpg");
        settings.setCloudRelayEnabled(true);
        settings.setWifiEnabled(true);
        settings.setWifiSsid("LeShaker-Guest");
    }

    @Test
    @DisplayName("connect and simulateDisconnect transition tunnel state and broadcast STOMP updates")
    void simulatorConnectAndDisconnectLifecycle() {
        when(appSettingsService.getSettings()).thenReturn(settings);
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)).thenReturn(true);
        when(appSettingsService.resolveEffectivePublicBaseUrl(eq(settings), eq("open-bar.eu"), anyBoolean()))
                .thenReturn("https://le-shaker-paris.open-bar.eu");
        when(accessService.parseAllowedRoles(any())).thenReturn(List.of("SERVEUR", "BARMAN", "MANAGER", "ADMIN"));

        CloudRelayStatusDTO connected = tunnelService.connect();
        assertThat(connected.connectionState()).isEqualTo(RelayConnectionState.SIMULATED);
        assertThat(connected.publicUrl()).isEqualTo("https://le-shaker-paris.open-bar.eu");

        CloudRelayStatusDTO disconnected = tunnelService.simulateDisconnect();
        assertThat(disconnected.connectionState()).isEqualTo(RelayConnectionState.RECONNECTING);
        assertThat(disconnected.reconnectAttempt()).isEqualTo(1);

        CloudRelayStatusDTO restored = tunnelService.simulateReconnect();
        assertThat(restored.connectionState()).isEqualTo(RelayConnectionState.SIMULATED);

        CloudRelayStatusDTO closed = tunnelService.disconnect();
        assertThat(closed.connectionState()).isEqualTo(RelayConnectionState.DISCONNECTED);
    }

    @Test
    @DisplayName("runDiagnostics reports SIMULATED_OK when healthy and MISCONFIGURED when slug missing")
    void diagnosticsProbeBehavior() {
        when(appSettingsService.getSettings()).thenReturn(settings);
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)).thenReturn(true);
        when(appSettingsService.resolveEffectivePublicBaseUrl(settings, "open-bar.eu", true))
                .thenReturn("https://le-shaker-paris.open-bar.eu");

        tunnelService.connect();
        CloudRelayDiagnosticDTO ok = tunnelService.runDiagnostics();
        assertThat(ok.success()).isTrue();
        assertThat(ok.status()).isEqualTo("SIMULATED_OK");

        settings.setVenueSlug(null);
        CloudRelayDiagnosticDTO misconfigured = tunnelService.runDiagnostics();
        assertThat(misconfigured.success()).isFalse();
        assertThat(misconfigured.status()).isEqualTo("MISCONFIGURED");
    }

    @Test
    @DisplayName("computeBackoffDelayMs scales exponentially and caps at reconnectMaxDelayMs")
    void exponentialBackoffCalculation() {
        assertThat(tunnelService.computeBackoffDelayMs(1)).isEqualTo(1000L);
        assertThat(tunnelService.computeBackoffDelayMs(2)).isEqualTo(2000L);
        assertThat(tunnelService.computeBackoffDelayMs(3)).isEqualTo(4000L);
        assertThat(tunnelService.computeBackoffDelayMs(10)).isEqualTo(32000L);
    }

    @Test
    @DisplayName("handleInboundMessage routes HTTP_REQUEST and WS_FRAME to RelayLocalDispatcher")
    void dispatchesHttpAndWebSocketFrames() {
        RelayTunnelMessage reqFrame = new RelayTunnelMessage(
                RelayFrameType.HTTP_REQUEST, "s-1", "GET", "/api/cocktails",
                "le-shaker-paris.open-bar.eu", Map.of(), null, null,
                null, null, null, null, null, Instant.now());
        when(localDispatcher.dispatchHttp(reqFrame))
                .thenReturn(RelayTunnelMessage.httpResponse("s-1", 200, Map.of(), "e30="));

        tunnelService.handleInboundMessage(reqFrame, mockSocket);
        verify(localDispatcher).dispatchHttp(reqFrame);
        verify(mockSocket).sendText(any(), eq(true));

        RelayTunnelMessage wsFrame = new RelayTunnelMessage(
                RelayFrameType.WS_FRAME, "ws-1", null, null, null, Map.of(),
                "Q09OTkVDVA==", null, null, null, null, null, null, Instant.now());
        tunnelService.handleInboundMessage(wsFrame, mockSocket);
        verify(localDispatcher).forwardWebSocketFrame(wsFrame);
    }

    @Test
    @DisplayName("getPublicBranding exposes white-label metadata and Wi-Fi fallback SSID")
    void publicBrandingIncludesWifiFallback() {
        when(appSettingsService.getSettings()).thenReturn(settings);
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY)).thenReturn(true);
        when(appSettingsService.resolveEffectivePublicBaseUrl(settings, "open-bar.eu", true))
                .thenReturn("https://le-shaker-paris.open-bar.eu");
        tunnelService.connect();

        PublicBrandingDTO branding = tunnelService.getPublicBranding();
        assertThat(branding.establishmentName()).isEqualTo("Le Shaker Paris");
        assertThat(branding.bannerImageUrl()).isEqualTo("https://cdn.example.com/banner.jpg");
        assertThat(branding.tunnelConnected()).isTrue();
        assertThat(branding.wifiSsid()).isEqualTo("LeShaker-Guest");
    }
}
