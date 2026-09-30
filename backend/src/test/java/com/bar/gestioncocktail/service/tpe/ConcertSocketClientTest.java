package com.bar.gestioncocktail.service.tpe;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.TpeTransactionStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit and loopback integration tests for {@link ConcertSocketClient} verifying
 * TCP socket communication, Concert handshaking, timeout handling, and cancellation aborts.
 */
class ConcertSocketClientTest {

    private final ConcertSocketClient socketClient = new ConcertSocketClient();

    private ServerSocket mockServerSocket;
    private ExecutorService serverExecutor;
    private int mockServerPort;

    @BeforeEach
    void setUp() throws Exception {
        mockServerSocket = new ServerSocket(0);
        mockServerPort = mockServerSocket.getLocalPort();
        serverExecutor = Executors.newCachedThreadPool();
    }

    @AfterEach
    void tearDown() throws Exception {
        if (mockServerSocket != null && !mockServerSocket.isClosed()) {
            mockServerSocket.close();
        }
        if (serverExecutor != null) {
            serverExecutor.shutdownNow();
        }
    }

    @Test
    @DisplayName("Should successfully probe a reachable TCP socket endpoint with Concert ENQ/ACK")
    void shouldSuccessfullyTestConnection() throws Exception {
        serverExecutor.submit(() -> {
            try (Socket clientSocket = mockServerSocket.accept()) {
                InputStream in = clientSocket.getInputStream();
                OutputStream out = clientSocket.getOutputStream();

                int b = in.read();
                if (b == ConcertProtocolConstants.ENQ) {
                    out.write(ConcertProtocolConstants.ACK);
                    out.flush();
                }
                in.read(); // Read EOT
            } catch (Exception _) {
                // Client closed socket during test probe
            }
        });

        long responseTime = socketClient.testConnection("127.0.0.1", mockServerPort, 2000);
        assertThat(responseTime).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("Should fail probe when target port is unreachable")
    void shouldFailConnectionWhenPortUnreachable() {
        assertThatThrownBy(() -> socketClient.testConnection("127.0.0.1", mockServerPort + 1000, 500))
                .isInstanceOf(Exception.class);
    }

    @Test
    @DisplayName("Should execute debit transaction over TCP loopback and parse approval")
    void shouldExecuteDebitTransactionSuccessfully() throws Exception {
        String txId = "test-tx-001";
        CountDownLatch transactionDone = new CountDownLatch(1);

        serverExecutor.submit(() -> {
            try (Socket socket = mockServerSocket.accept()) {
                InputStream in = socket.getInputStream();
                OutputStream out = socket.getOutputStream();

                // 1. Terminal receives ENQ from client -> sends ACK
                int b = in.read();
                if (b == ConcertProtocolConstants.ENQ) {
                    out.write(ConcertProtocolConstants.ACK);
                    out.flush();
                }

                // 2. Terminal reads debit frame (STX ... ETX LRC)
                byte[] buffer = new byte[256];
                int read = in.read(buffer);
                if (read > 0) {
                    // Send ACK to confirm debit frame received
                    out.write(ConcertProtocolConstants.ACK);
                    out.flush();
                }

                // 3. Client sends EOT
                in.read();

                // 4. Terminal sends ENQ to client to initiate response transmission
                out.write(ConcertProtocolConstants.ENQ);
                out.flush();

                // 5. Client responds with ACK
                in.read();

                // 6. Terminal sends response frame (STX ... ETX LRC)
                String responsePayload = "01000001550AUTH1234 VISA ************1234 000001";
                byte[] respFrame = buildMockResponseFrame(responsePayload);
                out.write(respFrame);
                out.flush();

                // 7. Client sends final ACK
                in.read();
            } catch (Exception _) {
                // Closed during test completion
            } finally {
                transactionDone.countDown();
            }
        });

        byte[] requestFrame = ConcertFrameBuilder.buildDebitFrame("01", 1550L, "978", "tx-001");
        ConcertFrameBuilder.ConcertResponse result = socketClient.sendDebitTransaction(
                txId,
                "127.0.0.1",
                mockServerPort,
                5,
                requestFrame
        );

        assertThat(transactionDone.await(5, TimeUnit.SECONDS)).isTrue();
        assertThat(result.status()).isEqualTo(TpeTransactionStatus.APPROVED);
        assertThat(result.authorizationCode()).isEqualTo("AUTH1234");
        assertThat(result.maskedPan()).isEqualTo("************1234");
        assertThat(result.cardBrand()).isEqualTo("VISA");
    }

    @Test
    @DisplayName("Should handle socket abort during long-running operation cleanly")
    void shouldAbortOngoingSocketTransaction() {
        String txId = "test-abort-tx";
        CountDownLatch clientConnected = new CountDownLatch(1);
        CountDownLatch serverCanClose = new CountDownLatch(1);

        serverExecutor.submit(() -> {
            try (Socket socket = mockServerSocket.accept()) {
                if (socket.isConnected()) {
                    clientConnected.countDown();
                }
                // Await latch instead of Thread.sleep to prevent Sonar rule violation
                serverCanClose.await(5, TimeUnit.SECONDS);
            } catch (Exception _) {
                // Socket aborted by client
            }
        });

        // Trigger abort from another thread after connection is accepted
        Executors.newSingleThreadScheduledExecutor().schedule(() -> {
            socketClient.abortTransaction(txId);
            serverCanClose.countDown();
        }, 300, TimeUnit.MILLISECONDS);

        byte[] requestFrame = ConcertFrameBuilder.buildDebitFrame("01", 5000L, "978", "abort-tx");
        assertThatThrownBy(() -> socketClient.sendDebitTransaction(
                txId,
                "127.0.0.1",
                mockServerPort,
                10,
                requestFrame
        )).isInstanceOf(BusinessException.class);
    }

    private byte[] buildMockResponseFrame(String content) {
        byte[] contentBytes = content.getBytes();
        byte[] frame = new byte[contentBytes.length + 3]; // STX + content + ETX + LRC
        frame[0] = ConcertProtocolConstants.STX;
        System.arraycopy(contentBytes, 0, frame, 1, contentBytes.length);
        frame[frame.length - 2] = ConcertProtocolConstants.ETX;

        byte lrc = 0;
        for (int i = 1; i <= frame.length - 2; i++) {
            lrc ^= frame[i];
        }
        frame[frame.length - 1] = lrc;
        return frame;
    }
}
