package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Result of a TCP socket reachability test against a payment terminal.
 *
 * @param success        Whether socket handshake succeeded
 * @param message        Diagnostic or error description
 * @param responseTimeMs Round-trip latency in milliseconds
 */
@Schema(description = "Diagnostic response for payment terminal connection test")
public record TpeConnectionTestResponseDTO(
    @Schema(description = "Whether the terminal connection succeeded", example = "true")
    boolean success,

    @Schema(description = "Diagnostic outcome message", example = "Terminal reachable (Concert handshake ACK)")
    String message,

    @Schema(description = "Round-trip latency in milliseconds", example = "24")
    long responseTimeMs
) {}
