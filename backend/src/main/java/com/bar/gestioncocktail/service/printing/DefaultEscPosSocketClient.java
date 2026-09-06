package com.bar.gestioncocktail.service.printing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * Default production implementation of {@link EscPosSocketClient} opening standard TCP sockets
 * to LAN thermal printers on port 9100 (raw9100).
 */
@Component
public class DefaultEscPosSocketClient implements EscPosSocketClient {

    private static final Logger log = LoggerFactory.getLogger(DefaultEscPosSocketClient.class);

    @Override
    public void send(String ip, int port, byte[] data, int timeoutMs) throws IOException {
        if (ip == null || ip.isBlank()) {
            throw new IllegalArgumentException("Printer IP address cannot be empty");
        }
        int effectiveTimeout = timeoutMs > 0 ? timeoutMs : 3000;
        log.debug("Opening TCP socket to printer at {}:{} (timeout: {}ms)", ip, port, effectiveTimeout);

        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(ip, port), effectiveTimeout);
            socket.setSoTimeout(effectiveTimeout);
            try (OutputStream out = socket.getOutputStream()) {
                out.write(data);
                out.flush();
            }
        }
        log.debug("Successfully sent {} bytes to printer at {}:{}", data.length, ip, port);
    }
}
