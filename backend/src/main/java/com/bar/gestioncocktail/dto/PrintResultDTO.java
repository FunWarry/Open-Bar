package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.PrinterRole;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * DTO describing the execution result of an ESC/POS socket print dispatch.
 *
 * @param success Whether the TCP socket connection and data write succeeded
 * @param role Printer role targeted (BAR, KITCHEN, CASH_DESK)
 * @param ip Target IP address
 * @param port Target TCP port
 * @param message Informational or error description
 * @param durationMs Round-trip socket execution duration in milliseconds
 */
@Schema(description = "Result of an ESC/POS network print transmission attempt")
public record PrintResultDTO(
    boolean success,
    String role,
    String ip,
    int port,
    String message,
    long durationMs
) {
    /**
     * Factory method for successful print result.
     *
     * @param role Printer role
     * @param ip Target IP
     * @param port Target TCP port
     * @param message Success description
     * @return Success PrintResultDTO
     */
    public static PrintResultDTO success(PrinterRole role, String ip, int port, String message) {
        return new PrintResultDTO(true, role != null ? role.name() : "CUSTOM", ip, port, message, 0L);
    }

    /**
     * Factory method for failed print result.
     *
     * @param role Printer role
     * @param ip Target IP
     * @param port Target TCP port
     * @param message Error description
     * @return Failure PrintResultDTO
     */
    public static PrintResultDTO failure(PrinterRole role, String ip, int port, String message) {
        return new PrintResultDTO(false, role != null ? role.name() : "CUSTOM", ip, port, message, 0L);
    }
}
