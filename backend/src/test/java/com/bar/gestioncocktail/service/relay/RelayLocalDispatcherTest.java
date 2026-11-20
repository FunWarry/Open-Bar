package com.bar.gestioncocktail.service.relay;

import com.bar.gestioncocktail.config.CloudRelayProperties;
import com.bar.gestioncocktail.dto.relay.RelayFrameType;
import com.bar.gestioncocktail.dto.relay.RelayTunnelMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.BiPredicate;
import javax.net.ssl.SSLSession;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link RelayLocalDispatcher} verifying local HTTP request proxying,
 * header filtering, SSRF path sanitization, error handling, and WebSocket stream bridging.
 */
@ExtendWith(MockitoExtension.class)
class RelayLocalDispatcherTest {

    @Mock
    private CloudRelayAccessService accessService;

    @Mock
    private HttpClient httpClient;

    private CloudRelayProperties properties;
    private RelayLocalDispatcher dispatcher;

    @BeforeEach
    void setUp() {
        properties = new CloudRelayProperties();
        properties.setLocalTargetUrl("http://127.0.0.1:8080/");
        dispatcher = new RelayLocalDispatcher(properties, accessService, httpClient);
    }

    @Test
    @DisplayName("sanitizeRelativePath accepts safe paths and rejects scheme or CRLF injection")
    void sanitizesRelativePathsStrictly() {
        assertThat(RelayLocalDispatcher.sanitizeRelativePath(null)).isEqualTo("/");
        assertThat(RelayLocalDispatcher.sanitizeRelativePath("  ")).isEqualTo("/");
        assertThat(RelayLocalDispatcher.sanitizeRelativePath("/api/cocktails?active=true"))
                .isEqualTo("/api/cocktails?active=true");
        assertThat(RelayLocalDispatcher.sanitizeRelativePath("http://evil.example/api")).isNull();
        assertThat(RelayLocalDispatcher.sanitizeRelativePath("//evil.example/api")).isNull();
        assertThat(RelayLocalDispatcher.sanitizeRelativePath("/api/test\r\nInjected: yes")).isNull();
    }

    @Test
    @DisplayName("dispatchHttp rejects invalid tunnel paths with 400 Bad Request")
    void dispatchHttpRejectsInvalidPath() {
        RelayTunnelMessage req = new RelayTunnelMessage(
                RelayFrameType.HTTP_REQUEST, "stream-bad", "GET", "//evil.example/hack",
                "le-shaker.open-bar.eu", Map.of(), null, null,
                null, null, null, null, null, Instant.now());

        RelayTunnelMessage res = dispatcher.dispatchHttp(req);

        assertThat(res.type()).isEqualTo(RelayFrameType.HTTP_RESPONSE);
        assertThat(res.statusCode()).isEqualTo(400);
        String body = new String(Base64.getDecoder().decode(res.bodyBase64()), StandardCharsets.UTF_8);
        assertThat(body).contains("Invalid tunnel request path");
    }

    @Test
    @DisplayName("dispatchHttp forwards headers, decodes body, strips hop-by-hop headers, and returns encoded response")
    void dispatchHttpForwardsPostAndFlattensHeaders() throws Exception {
        when(accessService.getInternalTunnelToken()).thenReturn("internal-secret-token");

        BiPredicate<String, String> acceptAll = (k, v) -> true;
        HttpHeaders responseHeaders = HttpHeaders.of(Map.of(
                "Content-Type", List.of("application/json"),
                "Connection", List.of("keep-alive"),
                "X-Custom", List.of("a", "b")
        ), acceptAll);
        HttpResponse<byte[]> stubResponse = byteArrayResponse(
                201, "{\"ok\":true}".getBytes(StandardCharsets.UTF_8), responseHeaders);

        when(httpClient.send(any(HttpRequest.class), Mockito.<HttpResponse.BodyHandler<byte[]>>any()))
                .thenReturn(stubResponse);

        String payloadB64 = Base64.getEncoder().encodeToString("{\"qty\":2}".getBytes(StandardCharsets.UTF_8));
        RelayTunnelMessage req = new RelayTunnelMessage(
                RelayFrameType.HTTP_REQUEST, "stream-post", "post", "/api/public/orders",
                "le-shaker.open-bar.eu",
                Map.of("Content-Type", "application/json", "Host", "spoofed.host", "Connection", "close"),
                payloadB64, null, null, null, null, null, null, Instant.now());

        RelayTunnelMessage res = dispatcher.dispatchHttp(req);

        ArgumentCaptor<HttpRequest> capturedReq = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(capturedReq.capture(), Mockito.<HttpResponse.BodyHandler<byte[]>>any());
        HttpRequest sent = capturedReq.getValue();
        assertThat(sent.uri()).hasToString("http://127.0.0.1:8080/api/public/orders");
        assertThat(sent.method()).isEqualTo("POST");
        assertThat(sent.headers().firstValue(CloudRelayAccessService.HEADER_VIA_RELAY)).contains("true");
        assertThat(sent.headers().firstValue(CloudRelayAccessService.HEADER_RELAY_TOKEN)).contains("internal-secret-token");
        assertThat(sent.headers().firstValue(CloudRelayAccessService.HEADER_FORWARDED_HOST))
                .contains("le-shaker.open-bar.eu");

        assertThat(res.statusCode()).isEqualTo(201);
        assertThat(res.headers()).containsEntry("Content-Type", "application/json");
        assertThat(res.headers()).containsEntry("X-Custom", "a, b");
        assertThat(res.headers()).doesNotContainKey("Connection");
        assertThat(new String(Base64.getDecoder().decode(res.bodyBase64()), StandardCharsets.UTF_8))
                .isEqualTo("{\"ok\":true}");
    }

    @Test
    @DisplayName("dispatchHttp handles InterruptedException and IOException with 502 error response")
    void dispatchHttpHandlesFailuresGracefully() throws Exception {
        when(accessService.getInternalTunnelToken()).thenReturn("internal-secret-token");
        when(httpClient.send(any(HttpRequest.class), Mockito.<HttpResponse.BodyHandler<byte[]>>any()))
                .thenThrow(new IOException("Connection refused"))
                .thenThrow(new InterruptedException("Interrupted"));

        RelayTunnelMessage req = new RelayTunnelMessage(
                RelayFrameType.HTTP_REQUEST, "s-err", null, "/api/health",
                null, null, null, null, null, null, null, null, null, Instant.now());

        RelayTunnelMessage ioRes = dispatcher.dispatchHttp(req);
        assertThat(ioRes.statusCode()).isEqualTo(502);

        RelayTunnelMessage interruptedRes = dispatcher.dispatchHttp(req);
        assertThat(interruptedRes.statusCode()).isEqualTo(502);
        assertThat(Thread.interrupted()).isTrue();
    }

    @Test
    @DisplayName("openWebSocketStream bridges WS frames, handles partial text chunks, forwards messages, and closes streams")
    void webSocketBridgeLifecycle() {
        when(accessService.getInternalTunnelToken()).thenReturn("internal-secret-token");

        WebSocket.Builder wsBuilder = mock(WebSocket.Builder.class);
        WebSocket bridgedSocket = mock(WebSocket.class);
        when(wsBuilder.connectTimeout(any())).thenReturn(wsBuilder);
        when(wsBuilder.header(anyString(), anyString())).thenReturn(wsBuilder);
        when(httpClient.newWebSocketBuilder()).thenReturn(wsBuilder);

        CompletableFuture<WebSocket> wsFuture = CompletableFuture.completedFuture(bridgedSocket);
        ArgumentCaptor<WebSocket.Listener> listenerCaptor = ArgumentCaptor.forClass(WebSocket.Listener.class);
        when(wsBuilder.buildAsync(any(), listenerCaptor.capture())).thenReturn(wsFuture);

        List<RelayTunnelMessage> emitted = new ArrayList<>();
        RelayTunnelMessage openFrame = new RelayTunnelMessage(
                RelayFrameType.WS_OPEN, "ws-100", null, "/ws/websocket",
                "le-shaker.open-bar.eu", Map.of("Sec-WebSocket-Protocol", "v12.stomp", "Connection", "Upgrade"),
                null, null, null, null, null, null, null, Instant.now());

        dispatcher.openWebSocketStream(openFrame, emitted::add);
        assertThat(dispatcher.getActiveStreamCount()).isEqualTo(1);

        // Partial + final WS text frame emitted upstream as base64 WS_FRAME
        WebSocket.Listener listener = listenerCaptor.getValue();
        listener.onText(bridgedSocket, "CONN", false);
        assertThat(emitted).isEmpty();
        listener.onText(bridgedSocket, "ECTED", true);
        assertThat(emitted).hasSize(1);
        assertThat(emitted.get(0).type()).isEqualTo(RelayFrameType.WS_FRAME);
        assertThat(new String(Base64.getDecoder().decode(emitted.get(0).bodyBase64()), StandardCharsets.UTF_8))
                .isEqualTo("CONNECTED");

        // Forward inbound WS_FRAME to local socket
        String msgB64 = Base64.getEncoder().encodeToString("SUBSCRIBE".getBytes(StandardCharsets.UTF_8));
        dispatcher.forwardWebSocketFrame(new RelayTunnelMessage(
                RelayFrameType.WS_FRAME, "ws-100", null, null, null, Map.of(),
                msgB64, null, null, null, null, null, null, Instant.now()));
        verify(bridgedSocket).sendText("SUBSCRIBE", true);

        // Close stream cleanly via closeAllStreams
        dispatcher.closeAllStreams();
        assertThat(dispatcher.getActiveStreamCount()).isZero();
        verify(bridgedSocket).sendClose(WebSocket.NORMAL_CLOSURE, "Tunnel stream closed");

        // Simulate listener close and error callbacks
        listener.onClose(bridgedSocket, 1000, "Normal");
        listener.onError(bridgedSocket, new RuntimeException("Socket reset"));
        assertThat(emitted.stream().filter(m -> m.type() == RelayFrameType.WS_CLOSE)).hasSize(2);
    }

    @Test
    @DisplayName("openWebSocketStream emits WS_CLOSE when local WebSocket connection fails and ignores invalid frames")
    void webSocketBridgeFailureAndGuards() {
        when(accessService.getInternalTunnelToken()).thenReturn("internal-secret-token");

        List<RelayTunnelMessage> emitted = new ArrayList<>();
        dispatcher.openWebSocketStream(new RelayTunnelMessage(
                RelayFrameType.WS_OPEN, "", null, "/ws", null, Map.of(),
                null, null, null, null, null, null, null, Instant.now()), emitted::add);
        dispatcher.forwardWebSocketFrame(new RelayTunnelMessage(
                RelayFrameType.WS_FRAME, null, null, null, null, Map.of(),
                null, null, null, null, null, null, null, Instant.now()));
        dispatcher.closeWebSocketStream(null);
        verify(httpClient, never()).newWebSocketBuilder();

        WebSocket.Builder wsBuilder = mock(WebSocket.Builder.class);
        when(wsBuilder.connectTimeout(any())).thenReturn(wsBuilder);
        when(wsBuilder.header(anyString(), anyString())).thenReturn(wsBuilder);
        when(httpClient.newWebSocketBuilder()).thenReturn(wsBuilder);

        CompletableFuture<WebSocket> failedFuture = new CompletableFuture<>();
        failedFuture.completeExceptionally(new IllegalStateException("Local WS refused"));
        when(wsBuilder.buildAsync(any(), any())).thenReturn(failedFuture);

        dispatcher.openWebSocketStream(new RelayTunnelMessage(
                RelayFrameType.WS_OPEN, "ws-fail", null, "/ws/websocket", null, null,
                null, null, null, null, null, null, null, Instant.now()), emitted::add);

        assertThat(emitted).hasSize(1);
        assertThat(emitted.get(0).type()).isEqualTo(RelayFrameType.WS_CLOSE);
        assertThat(emitted.get(0).errorCode()).isEqualTo("WS_CONNECT_FAILED");
    }

    private static HttpResponse<byte[]> byteArrayResponse(int statusCode, byte[] body, HttpHeaders headers) {
        return new HttpResponse<>() {
            @Override
            public int statusCode() {
                return statusCode;
            }

            @Override
            public HttpRequest request() {
                return HttpRequest.newBuilder(URI.create("http://127.0.0.1:8080/test")).build();
            }

            @Override
            public Optional<HttpResponse<byte[]>> previousResponse() {
                return Optional.empty();
            }

            @Override
            public HttpHeaders headers() {
                return headers;
            }

            @Override
            public byte[] body() {
                return body;
            }

            @Override
            public Optional<SSLSession> sslSession() {
                return Optional.empty();
            }

            @Override
            public URI uri() {
                return URI.create("http://127.0.0.1:8080/test");
            }

            @Override
            public HttpClient.Version version() {
                return HttpClient.Version.HTTP_1_1;
            }
        };
    }
}
