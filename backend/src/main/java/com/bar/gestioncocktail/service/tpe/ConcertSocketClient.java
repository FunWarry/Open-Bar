package com.bar.gestioncocktail.service.tpe;

import com.bar.gestioncocktail.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static com.bar.gestioncocktail.service.tpe.ConcertProtocolConstants.*;

/**
 * Low-level TCP/IP client handling socket handshakes, framing transmissions,
 * timeouts, and cancellations with physical payment terminals over the local network.
 */
@Component
public class ConcertSocketClient {

    private static final Logger log = LoggerFactory.getLogger(ConcertSocketClient.class);

    private final Map<String, Socket> activeTransactionSockets = new ConcurrentHashMap<>();

    /**
     * Executes a complete debit transaction with a physical payment terminal over TCP socket.
     *
     * @param transactionId  Unique transaction tracking ID
     * @param ip             Terminal local network IP address
     * @param port           Terminal TCP port (typically 8888)
     * @param timeoutSeconds Transaction overall timeout in seconds
     * @param requestFrame   Framed request byte array (including STX, payload, ETX, LRC)
     * @return Decoded {@link ConcertFrameBuilder.ConcertResponse}
     */
    public ConcertFrameBuilder.ConcertResponse sendDebitTransaction(
            String transactionId,
            String ip,
            int port,
            int timeoutSeconds,
            byte[] requestFrame
    ) {
        String safeTxId = sanitizeLog(transactionId);
        String safeIp = sanitizeLog(ip);
        log.info("Connecting to TPE at {}:{} for transaction {}", safeIp, port, safeTxId);

        try (Socket socket = new Socket()) {
            activeTransactionSockets.put(transactionId, socket);
            socket.connect(new InetSocketAddress(ip, port), 5000);
            socket.setSoTimeout(Math.max(5, timeoutSeconds) * 1000);

            OutputStream out = socket.getOutputStream();
            InputStream in = socket.getInputStream();

            // 1. Handshake ENQ -> ACK
            performHandshake(out, in);

            // 2. Transmit debit frame and line release EOT
            transmitDebitFrame(out, in, requestFrame);

            // 3. Wait for terminal to finish customer card presentation and authorization
            waitForTerminalEnq(out, in);

            // 4. Read response frame and acknowledge
            byte[] responseBytes = readResponseBytes(out, in);
            log.info("Received {} response bytes from TPE for transaction {}", responseBytes.length, safeTxId);

            return ConcertFrameBuilder.parseResponseFrame(responseBytes);
        } catch (SocketTimeoutException e) {
            log.warn("TPE transaction {} timed out after {}s", safeTxId, timeoutSeconds);
            throw new BusinessException("Transaction card terminal timed out: customer did not complete payment in time", e);
        } catch (IOException e) {
            log.error("Socket communication error with TPE {}:{} for transaction {}", safeIp, port, safeTxId, e);
            throw new BusinessException("Failed to communicate with payment terminal: " + e.getMessage(), e);
        } finally {
            activeTransactionSockets.remove(transactionId);
        }
    }

    /**
     * Attempts to cancel an active in-flight transaction by aborting its socket connection.
     *
     * @param transactionId Target transaction identifier
     * @return True if an active socket was interrupted, false otherwise
     */
    public boolean abortTransaction(String transactionId) {
        String safeTxId = sanitizeLog(transactionId);
        Socket socket = activeTransactionSockets.remove(transactionId);
        if (socket != null && !socket.isClosed()) {
            try {
                log.info("Aborting socket connection for transaction {}", safeTxId);
                socket.close();
                return true;
            } catch (IOException e) {
                log.warn("Error closing aborted transaction socket {}", safeTxId, e);
            }
        }
        return false;
    }

    private static String sanitizeLog(String input) {
        if (input == null) {
            return "";
        }
        return input.replaceAll("[^a-zA-Z0-9_.-]", "");
    }

    /**
     * Performs a lightweight TCP connectivity and ENQ handshake probe against the terminal.
     *
     * @param ip        Terminal IP address
     * @param port      Terminal TCP port
     * @param timeoutMs Connection timeout in milliseconds
     * @return Round-trip time in milliseconds if handshake succeeded
     * @throws IOException If connection or handshake fails
     */
    public long testConnection(String ip, int port, int timeoutMs) throws IOException {
        long start = System.currentTimeMillis();
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(ip, port), timeoutMs);
            socket.setSoTimeout(timeoutMs);

            OutputStream out = socket.getOutputStream();
            InputStream in = socket.getInputStream();

            out.write(ENQ);
            out.flush();

            int resp = in.read();
            if (resp != ACK && resp != NAK) {
                throw new IOException(String.format("Invalid handshake response byte: 0x%02X", resp));
            }

            out.write(EOT);
            out.flush();

            return System.currentTimeMillis() - start;
        }
    }

    private void performHandshake(OutputStream out, InputStream in) throws IOException {
        out.write(ENQ);
        out.flush();

        int initialAck = in.read();
        if (initialAck != ACK) {
            if (initialAck == NAK) {
                throw new BusinessException("Payment terminal busy or rejected access (NAK received)");
            }
            throw new BusinessException(String.format("Payment terminal handshake failed: expected ACK (0x06) but received 0x%02X", initialAck));
        }
    }

    private void transmitDebitFrame(OutputStream out, InputStream in, byte[] requestFrame) throws IOException {
        out.write(requestFrame);
        out.flush();

        int frameAck = in.read();
        if (frameAck != ACK) {
            throw new BusinessException(String.format("Terminal failed to acknowledge transaction frame: received 0x%02X", frameAck));
        }

        out.write(EOT);
        out.flush();
    }

    private void waitForTerminalEnq(OutputStream out, InputStream in) throws IOException {
        int terminalEnq = in.read();
        if (terminalEnq != ENQ) {
            throw new BusinessException(String.format("Unexpected response waiting for terminal completion: expected ENQ but received 0x%02X", terminalEnq));
        }

        out.write(ACK);
        out.flush();
    }

    private byte[] readResponseBytes(OutputStream out, InputStream in) throws IOException {
        ByteArrayOutputStream responseBuffer = new ByteArrayOutputStream();
        int b;
        boolean inFrame = false;

        while ((b = in.read()) != -1) {
            if (b == STX) {
                inFrame = true;
                responseBuffer.write(b);
            } else if (inFrame) {
                responseBuffer.write(b);
                if (b == ETX) {
                    int lrcByte = in.read();
                    if (lrcByte != -1) {
                        responseBuffer.write(lrcByte);
                    }
                    break;
                }
            }
        }

        out.write(ACK);
        out.flush();

        return responseBuffer.toByteArray();
    }
}
