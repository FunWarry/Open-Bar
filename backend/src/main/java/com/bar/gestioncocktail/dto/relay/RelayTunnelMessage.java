package com.bar.gestioncocktail.dto.relay;

import java.time.Instant;
import java.util.Map;

/**
 * Multiplexed message envelope exchanged between the local OpenBar server and the Cloud Relay gateway.
 *
 * @param type         Frame type (handshake, HTTP proxy, WebSocket bridge, or heartbeat)
 * @param streamId     Unique stream identifier correlating requests/responses and WS sessions
 * @param method       HTTP method for {@code HTTP_REQUEST} frames
 * @param path         Request URI including query string
 * @param host         Original public {@code Host} header (e.g. {@code le-shaker.open-bar.eu} or CNAME)
 * @param headers      HTTP or WebSocket handshake headers
 * @param bodyBase64   Base64-encoded request/response body or WebSocket frame payload
 * @param statusCode   HTTP status code for {@code HTTP_RESPONSE} frames
 * @param venueSlug    Registered venue subdomain slug
 * @param customDomain Optional custom white-label CNAME hostname
 * @param pairingToken Secret pairing token used during {@code REGISTER}
 * @param errorCode    Optional machine-readable error code
 * @param errorMessage Optional diagnostic error message
 * @param timestamp    UTC frame timestamp
 */
public record RelayTunnelMessage(
        RelayFrameType type,
        String streamId,
        String method,
        String path,
        String host,
        Map<String, String> headers,
        String bodyBase64,
        Integer statusCode,
        String venueSlug,
        String customDomain,
        String pairingToken,
        String errorCode,
        String errorMessage,
        Instant timestamp
) {
    /**
     * Builds a registration handshake frame.
     */
    public static RelayTunnelMessage register(String venueSlug, String customDomain, String pairingToken) {
        return new RelayTunnelMessage(
                RelayFrameType.REGISTER, null, null, null, null, Map.of(),
                null, null, venueSlug, customDomain, pairingToken, null, null, Instant.now());
    }

    /**
     * Builds a heartbeat ping frame.
     */
    public static RelayTunnelMessage ping(String streamId) {
        return new RelayTunnelMessage(
                RelayFrameType.PING, streamId, null, null, null, Map.of(),
                null, null, null, null, null, null, null, Instant.now());
    }

    /**
     * Builds an HTTP response frame.
     */
    public static RelayTunnelMessage httpResponse(String streamId, int statusCode, Map<String, String> headers, String bodyBase64) {
        return new RelayTunnelMessage(
                RelayFrameType.HTTP_RESPONSE, streamId, null, null, null,
                headers != null ? headers : Map.of(), bodyBase64, statusCode,
                null, null, null, null, null, Instant.now());
    }
}
