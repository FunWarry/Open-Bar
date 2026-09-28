package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Real-time event broadcasted over STOMP topic {@code /topic/roulette/events}.
 */
@Schema(description = "Real-time WebSocket event for synchronous roulette animations across screens")
public record RouletteEventDTO(
        @Schema(description = "Event type: SPIN_TRIGGERED, SPIN_COMPLETED, SECTORS_UPDATED", example = "SPIN_TRIGGERED")
        String eventType,

        @Schema(description = "Unique event UUID", example = "c8b6e021-39fe-45a8-a3f2-1f4a9b6c00d1")
        String eventId,

        @Schema(description = "Target table identifier if any", example = "5")
        Long tableId,

        @Schema(description = "Target table display number", example = "5")
        Integer tableNumero,

        @Schema(description = "Full outcome of the resolved spin")
        RouletteSpinResultDTO spinResult,

        @Schema(description = "Animation duration in milliseconds", example = "5000")
        int durationMs,

        @Schema(description = "Sound profile to play: CSGO or ARCADE", example = "CSGO")
        String soundProfile,

        @Schema(description = "Event timestamp")
        LocalDateTime timestamp
) {
}
