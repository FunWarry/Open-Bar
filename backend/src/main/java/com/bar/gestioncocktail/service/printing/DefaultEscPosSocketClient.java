package com.bar.gestioncocktail.service.printing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.Set;

/**
 * Default production implementation of {@link EscPosSocketClient} opening standard TCP sockets
 * to LAN thermal printers on port 9100 (raw9100).
 */
@Component
public class DefaultEscPosSocketClient implements EscPosSocketClient {

    private static final Logger log = LoggerFactory.getLogger(DefaultEscPosSocketClient.class);
    private static final Set<Integer> FORBIDDEN_PORTS = Set.of(3306, 5432, 6379, 27017);

    @Override
    public void send(String ip, int port, byte[] data, int timeoutMs) throws IOException {
        if (ip == null || ip.isBlank()) {
            throw new IllegalArgumentException("Printer IP address cannot be empty");
        }
        validateSocketTarget(ip, port);
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

    private void validateSocketTarget(String ip, int port) throws IOException {
        if (port < 1024 || port > 65535 || FORBIDDEN_PORTS.contains(port)) {
            throw new IllegalArgumentException("Target port is outside allowed peripheral range: " + port);
        }
        InetAddress addr = InetAddress.getByName(ip.trim());
        if (addr.isLinkLocalAddress() || addr.isMulticastAddress() || addr.isAnyLocalAddress()) {
            throw new IllegalArgumentException("Target IP address is not an allowed peripheral address");
        }
    }
}
