package com.bar.gestioncocktail.service.printing;

import java.io.IOException;

/**
 * Socket client interface for transmitting raw binary ESC/POS byte streams to network thermal printers.
 */
public interface EscPosSocketClient {

    /**
     * Transmits raw binary ESC/POS data to the specified IP and TCP port.
     *
     * @param ip Printer IPv4 address or hostname
     * @param port Network printer raw port (usually 9100)
     * @param data Raw ESC/POS byte stream
     * @param timeoutMs Connection and socket timeout in milliseconds
     * @throws IOException If a connection failure, timeout, or transmission error occurs
     */
    void send(String ip, int port, byte[] data, int timeoutMs) throws IOException;
}
