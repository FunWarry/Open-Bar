package com.bar.gestioncocktail.service.printing;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DefaultEscPosSocketClientTest {

    private final DefaultEscPosSocketClient client = new DefaultEscPosSocketClient();

    @Test
    @DisplayName("send throws IllegalArgumentException when IP is null or blank")
    void send_blankOrNullIp_throwsException() {
        assertThatThrownBy(() -> client.send(null, 9100, new byte[] { 1 }, 1000))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> client.send("   ", 9100, new byte[] { 1 }, 1000))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("send transmits byte payload through TCP socket to local listener")
    void send_validData_transmitsSuccessfully() throws Exception {
        byte[] payload = "TEST_ESC_POS_BYTES".getBytes();
        AtomicReference<byte[]> receivedData = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);

        try (ServerSocket serverSocket = new ServerSocket(0)) {
            int port = serverSocket.getLocalPort();

            Thread serverThread = new Thread(() -> {
                try (Socket socket = serverSocket.accept();
                        InputStream in = socket.getInputStream();
                        ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
                    byte[] data = new byte[1024];
                    int nRead;
                    while ((nRead = in.read(data, 0, data.length)) != -1) {
                        buffer.write(data, 0, nRead);
                    }
                    receivedData.set(buffer.toByteArray());
                } catch (IOException _) {
                    // Stream closed during test socket teardown
                } finally {
                    latch.countDown();
                }
            });
            serverThread.start();

            client.send("127.0.0.1", port, payload, 0);

            boolean received = latch.await(3, TimeUnit.SECONDS);
            assertThat(received).isTrue();
            assertThat(receivedData.get()).isEqualTo(payload);
        }
    }

    @Test
    @DisplayName("send throws IOException when target port is unreachable")
    void send_unreachableTarget_throwsIOException() {
        assertThatThrownBy(() -> client.send("127.0.0.1", 59999, new byte[] { 1, 2, 3 }, 100))
                .isInstanceOf(IOException.class);
    }
}
