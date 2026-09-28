package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Request payload for the bartender to trigger a live roulette spin on secondary displays.
 */
@Schema(description = "Bartender trigger parameters for live broadcast roulette spins")
public record RouletteBroadcastSpinRequestDTO(
        @Schema(description = "Target table identifier (null for general bar event)", example = "3")
        Long tableId,

        @Schema(description = "Trigger mode: RANDOM, CATEGORY, RIGGED_SECTOR, RIGGED_COCKTAIL", example = "RANDOM")
        String mode,

        @Schema(description = "Spirit category if mode is CATEGORY (e.g. GIN, RUM, MOCKTAIL)", example = "GIN")
        String spiritCategory,

        @Schema(description = "Secretly rigged sector ID if mode is RIGGED_SECTOR", example = "2")
        Long riggedSectorId,

        @Schema(description = "Secretly rigged cocktail ID if mode is RIGGED_COCKTAIL", example = "15")
        Long riggedCocktailId,

        @Schema(description = "Whether to auto-add to table cart when finished", example = "true")
        boolean autoAddToCart,

        @Schema(description = "Animation duration in seconds (default 5)", example = "5")
        Integer durationSeconds,

        @Schema(description = "Audio sound profile (CSGO or ARCADE)", example = "CSGO")
        String soundProfile
) {
}
