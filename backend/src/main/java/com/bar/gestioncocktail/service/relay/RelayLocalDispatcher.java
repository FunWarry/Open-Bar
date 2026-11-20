package com.bar.gestioncocktail.service.relay;

import com.bar.gestioncocktail.config.CloudRelayProperties;
import com.bar.gestioncocktail.dto.relay.RelayFrameType;
import com.bar.gestioncocktail.dto.relay.RelayTunnelMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * Dispatches inbound tunneled HTTP requests and STOMP WebSocket streams from the Cloud Relay
 * to the local OpenBar HTTP/WebSocket runtime while preserving tenant host metadata
 * and injecting verified internal tunnel provenance headers.
 */
@Service
public class RelayLocalDispatcher {

    private static final Logger log = LoggerFactory.getLogger(RelayLocalDispatcher.class);
    private static final Set<String> HOP_BY_HOP_HEADERS = Set.of(
            "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
            "te", "trailer", "transfer-encoding", "upgrade", "host", "content-length"
    );

    private final CloudRelayProperties properties;
    private final CloudRelayAccessService accessService;
    private final HttpClient httpClient;
    private final Map<String, WebSocket> bridgedSockets = new ConcurrentHashMap<>();

    /**
     * Constructs RelayLocalDispatcher with default JDK {@link HttpClient}.
     *
     * @param properties    Cloud Relay configuration properties
     * @param accessService Relay access policy and internal token provider
     */
    @Autowired
    public RelayLocalDispatcher(CloudRelayProperties properties, CloudRelayAccessService accessService) {
        this(properties, accessService, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build());
    }

    /**
     * Constructs RelayLocalDispatcher with an explicit {@link HttpClient} for unit testing.
     *
     * @param properties    Cloud Relay configuration properties
     * @param accessService Relay access policy and internal token provider
     * @param httpClient    HTTP/WebSocket client
     */
    public RelayLocalDispatcher(
            CloudRelayProperties properties,
            CloudRelayAccessService accessService,
            HttpClient httpClient) {
        this.properties = properties;
        this.accessService = accessService;
        this.httpClient = httpClient;
    }

    /**
     * Dispatches an inbound {@code HTTP_REQUEST} tunnel frame against the local backend server.
     *
     * @param requestFrame Incoming tunnel request frame
     * @return Corresponding {@code HTTP_RESPONSE} frame
     */
    public RelayTunnelMessage dispatchHttp(RelayTunnelMessage requestFrame) {
        String safePath = sanitizeRelativePath(requestFrame.path());
        if (safePath == null) {
            return RelayTunnelMessage.httpResponse(
                    requestFrame.streamId(), 400, Map.of("Content-Type", "application/json"),
                    encodeBase64("{\"error\":\"Invalid tunnel request path\"}"));
        }

        String method = requestFrame.method() != null
                ? requestFrame.method().trim().toUpperCase(Locale.ROOT)
                : "GET";
        URI targetUri = URI.create(normalizeBaseUrl(properties.getLocalTargetUrl()) + safePath);

        HttpRequest.Builder builder = HttpRequest.newBuilder(targetUri)
                .timeout(Duration.ofSeconds(30));

        if (requestFrame.headers() != null) {
            for (Map.Entry<String, String> entry : requestFrame.headers().entrySet()) {
                if (entry.getKey() != null && entry.getValue() != null
                        && !HOP_BY_HOP_HEADERS.contains(entry.getKey().toLowerCase(Locale.ROOT))) {
                    builder.header(entry.getKey(), entry.getValue());
                }
            }
        }

        builder.header(CloudRelayAccessService.HEADER_VIA_RELAY, "true");
        builder.header(CloudRelayAccessService.HEADER_RELAY_TOKEN, accessService.getInternalTunnelToken());
        if (requestFrame.host() != null && !requestFrame.host().isBlank()) {
            builder.header(CloudRelayAccessService.HEADER_FORWARDED_HOST, requestFrame.host());
        }

        HttpRequest.BodyPublisher bodyPublisher = buildBodyPublisher(method, requestFrame.bodyBase64());
        builder.method(method, bodyPublisher);

        try {
            HttpResponse<byte[]> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
            Map<String, String> responseHeaders = flattenHeaders(response.headers().map());
            String encodedBody = response.body() != null && response.body().length > 0
                    ? Base64.getEncoder().encodeToString(response.body())
                    : "";
            return RelayTunnelMessage.httpResponse(requestFrame.streamId(), response.statusCode(), responseHeaders, encodedBody);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("Tunneled HTTP dispatch interrupted for {}: {}", safePath, ex.getMessage());
            return errorResponse(requestFrame.streamId(), 502, "Local dispatch interrupted");
        } catch (Exception ex) {
            log.warn("Tunneled HTTP dispatch failed for {}: {}", safePath, ex.getMessage());
            return errorResponse(requestFrame.streamId(), 502, "Local backend unreachable");
        }
    }

    /**
     * Opens a local WebSocket session bridged to a tunnel stream ID (used for STOMP real-time updates).
     *
     * @param openFrame    Incoming {@code WS_OPEN} tunnel frame
     * @param outboundSink Callback emitting frames back into the persistent Cloud Relay tunnel
     */
    public void openWebSocketStream(RelayTunnelMessage openFrame, Consumer<RelayTunnelMessage> outboundSink) {
        String streamId = openFrame.streamId();
        String safePath = sanitizeRelativePath(openFrame.path());
        if (streamId == null || streamId.isBlank() || safePath == null) {
            return;
        }
        String wsBase = toWebSocketBaseUrl(normalizeBaseUrl(properties.getLocalTargetUrl()));
        URI wsUri = URI.create(wsBase + safePath);

        WebSocket.Builder builder = httpClient.newWebSocketBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .header(CloudRelayAccessService.HEADER_VIA_RELAY, "true")
                .header(CloudRelayAccessService.HEADER_RELAY_TOKEN, accessService.getInternalTunnelToken());

        if (openFrame.host() != null && !openFrame.host().isBlank()) {
            builder.header(CloudRelayAccessService.HEADER_FORWARDED_HOST, openFrame.host());
        }
        appendFilteredWsHeaders(builder, openFrame.headers());

        builder.buildAsync(wsUri, buildTunnelWebSocketListener(streamId, outboundSink))
                .whenComplete((ws, err) -> handleWebSocketConnectResult(streamId, ws, err, outboundSink));
    }

    private void appendFilteredWsHeaders(WebSocket.Builder builder, Map<String, String> headers) {
        if (headers == null) {
            return;
        }
        for (Map.Entry<String, String> entry : headers.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null
                    && !HOP_BY_HOP_HEADERS.contains(entry.getKey().toLowerCase(Locale.ROOT))) {
                builder.header(entry.getKey(), entry.getValue());
            }
        }
    }

    private WebSocket.Listener buildTunnelWebSocketListener(String streamId, Consumer<RelayTunnelMessage> outboundSink) {
        return new WebSocket.Listener() {
            private final StringBuilder textBuffer = new StringBuilder();

            @Override
            public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                textBuffer.append(data);
                if (last) {
                    String fullPayload = textBuffer.toString();
                    textBuffer.setLength(0);
                    outboundSink.accept(new RelayTunnelMessage(
                            RelayFrameType.WS_FRAME, streamId, null, null, null, Map.of(),
                            encodeBase64(fullPayload), null, null, null, null, null, null, Instant.now()));
                }
                webSocket.request(1);
                return CompletableFuture.completedFuture(null);
            }

            @Override
            public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                bridgedSockets.remove(streamId);
                outboundSink.accept(new RelayTunnelMessage(
                        RelayFrameType.WS_CLOSE, streamId, null, null, null, Map.of(),
                        null, statusCode, null, null, null, null, reason, Instant.now()));
                return CompletableFuture.completedFuture(null);
            }

            @Override
            public void onError(WebSocket webSocket, Throwable error) {
                bridgedSockets.remove(streamId);
                outboundSink.accept(new RelayTunnelMessage(
                        RelayFrameType.WS_CLOSE, streamId, null, null, null, Map.of(),
                        null, 1011, null, null, null, "WS_BRIDGE_ERROR", error.getMessage(), Instant.now()));
            }
        };
    }

    private void handleWebSocketConnectResult(
            String streamId,
            WebSocket ws,
            Throwable err,
            Consumer<RelayTunnelMessage> outboundSink) {
        if (err != null) {
            log.warn("Failed to open local WS bridge for stream {}: {}", streamId, err.getMessage());
            outboundSink.accept(new RelayTunnelMessage(
                    RelayFrameType.WS_CLOSE, streamId, null, null, null, Map.of(),
                    null, 1011, null, null, null, "WS_CONNECT_FAILED", err.getMessage(), Instant.now()));
        } else if (ws != null) {
            bridgedSockets.put(streamId, ws);
        }
    }

    /**
     * Forwards a {@code WS_FRAME} payload onto an open local bridged WebSocket.
     *
     * @param frame Tunnel WebSocket frame
     */
    public void forwardWebSocketFrame(RelayTunnelMessage frame) {
        if (frame.streamId() == null) {
            return;
        }
        WebSocket socket = bridgedSockets.get(frame.streamId());
        if (socket != null && frame.bodyBase64() != null) {
            String payload = new String(Base64.getDecoder().decode(frame.bodyBase64()), StandardCharsets.UTF_8);
            socket.sendText(payload, true);
        }
    }

    /**
     * Closes a bridged local WebSocket stream cleanly.
     *
     * @param streamId Stream identifier
     */
    public void closeWebSocketStream(String streamId) {
        if (streamId == null) {
            return;
        }
        WebSocket socket = bridgedSockets.remove(streamId);
        if (socket != null) {
            socket.sendClose(WebSocket.NORMAL_CLOSURE, "Tunnel stream closed");
        }
    }

    /**
     * Closes all active bridged WebSocket streams when the tunnel disconnects.
     */
    public void closeAllStreams() {
        for (String streamId : List.copyOf(bridgedSockets.keySet())) {
            closeWebSocketStream(streamId);
        }
    }

    /**
     * Returns the count of currently open bridged WebSocket streams.
     *
     * @return Active stream count
     */
    public int getActiveStreamCount() {
        return bridgedSockets.size();
    }

    /**
     * Validates that an inbound path is strictly relative and free of CRLF or SSRF scheme injection.
     *
     * @param rawPath Path from tunnel frame
     * @return Sanitized relative path starting with {@code /}, or {@code null} if invalid
     */
    public static String sanitizeRelativePath(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) {
            return "/";
        }
        String trimmed = rawPath.trim();
        if (!trimmed.startsWith("/") || trimmed.startsWith("//")
                || trimmed.contains("\r") || trimmed.contains("\n")) {
            return null;
        }
        return trimmed;
    }

    private static HttpRequest.BodyPublisher buildBodyPublisher(String method, String bodyBase64) {
        if ("GET".equals(method) || "HEAD".equals(method) || "DELETE".equals(method)) {
            return HttpRequest.BodyPublishers.noBody();
        }
        if (bodyBase64 == null || bodyBase64.isEmpty()) {
            return HttpRequest.BodyPublishers.noBody();
        }
        return HttpRequest.BodyPublishers.ofByteArray(Base64.getDecoder().decode(bodyBase64));
    }

    private static Map<String, String> flattenHeaders(Map<String, List<String>> rawHeaders) {
        Map<String, String> result = new LinkedHashMap<>();
        if (rawHeaders == null) {
            return result;
        }
        for (Map.Entry<String, List<String>> entry : rawHeaders.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null && !entry.getValue().isEmpty()
                    && !HOP_BY_HOP_HEADERS.contains(entry.getKey().toLowerCase(Locale.ROOT))) {
                result.put(entry.getKey(), String.join(", ", entry.getValue()));
            }
        }
        return result;
    }

    private static RelayTunnelMessage errorResponse(String streamId, int status, String reason) {
        return RelayTunnelMessage.httpResponse(
                streamId, status, Map.of("Content-Type", "application/json"),
                encodeBase64("{\"error\":\"" + reason + "\"}"));
    }

    private static String encodeBase64(String value) {
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private static String normalizeBaseUrl(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "http://127.0.0.1:8080";
        }
        String trimmed = baseUrl.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private static String toWebSocketBaseUrl(String httpBase) {
        if (httpBase.startsWith("https://")) {
            return "wss://" + httpBase.substring("https://".length());
        }
        if (httpBase.startsWith("http://")) {
            return "ws://" + httpBase.substring("http://".length());
        }
        return httpBase;
    }
}
