package com.bar.gestioncocktail.dto.relay;

import com.bar.gestioncocktail.model.RelayConnectionState;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

/**
 * Live telemetry, domain mapping, and configurable access policy status of the Cloud Relay tunnel.
 *
 * @param moduleEnabled         Whether the {@code CLOUD_RELAY} plug-and-play module is active
 * @param relayEnabled          Whether the establishment enabled outbound Cloud Relay connectivity
 * @param connectionState       Current tunnel connection state
 * @param venueSlug             Configured subdomain slug (e.g. {@code le-shaker})
 * @param customDomain          Optional white-label custom domain CNAME
 * @param baseDomain            Base Cloud Relay domain (e.g. {@code open-bar.eu})
 * @param publicUrl             Resolved effective public URL (custom domain or subdomain)
 * @param tunnelEndpoint        Configured Cloud Relay gateway WSS URL
 * @param pairingTokenConfigured Whether a relay pairing token is saved
 * @param connectedSince        Timestamp when the current tunnel connection was established
 * @param lastHeartbeatAt       Timestamp of the most recent heartbeat acknowledgement
 * @param lastError             Latest error message if any
 * @param reconnectAttempt      Current consecutive reconnect attempt counter
 * @param nextRetryInSeconds    Seconds remaining before next reconnect attempt
 * @param activeStreams         Count of active bridged WebSocket/HTTP streams
 * @param totalProxiedRequests  Total HTTP requests dispatched via the tunnel
 * @param totalProxiedWsFrames  Total WebSocket frames bridged via the tunnel
 * @param averageLatencyMs      Measured round-trip heartbeat latency in milliseconds
 * @param simulatorMode         Whether local tunnel simulator mode is active
 * @param clientsEnabled        Whether patron QR & pay-at-table access via tunnel is enabled
 * @param staffEnabled          Whether staff access via tunnel is enabled
 * @param adminEnabled          Whether admin console access via tunnel is enabled
 * @param remoteTpeEnabled      Whether remote TPE payment dispatch via tunnel is enabled
 * @param remotePrintingEnabled Whether remote ESC/POS printing via tunnel is enabled
 * @param allowedRoles          Staff roles authorized to connect through the tunnel
 */
@Schema(description = "Live Cloud Relay tunnel status, public URL resolution, and access control summary")
public record CloudRelayStatusDTO(
        boolean moduleEnabled,
        boolean relayEnabled,
        RelayConnectionState connectionState,
        String venueSlug,
        String customDomain,
        String baseDomain,
        String publicUrl,
        String tunnelEndpoint,
        boolean pairingTokenConfigured,
        Instant connectedSince,
        Instant lastHeartbeatAt,
        String lastError,
        int reconnectAttempt,
        long nextRetryInSeconds,
        int activeStreams,
        long totalProxiedRequests,
        long totalProxiedWsFrames,
        long averageLatencyMs,
        boolean simulatorMode,
        boolean clientsEnabled,
        boolean staffEnabled,
        boolean adminEnabled,
        boolean remoteTpeEnabled,
        boolean remotePrintingEnabled,
        List<String> allowedRoles
) {
}
