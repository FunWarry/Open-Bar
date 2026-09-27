package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;

/**
 * Public configuration DTO for the cocktail roulette feature.
 */
@Schema(description = "Public configuration and active wheel sectors for customer roulette")
public record RoulettePublicConfigDTO(
        @Schema(description = "Whether the roulette module is enabled for this establishment", example = "true")
        boolean enabled,

        @Schema(description = "Discounted fixed price for alcoholic cocktail roulette", example = "7.50")
        BigDecimal priceCocktail,

        @Schema(description = "Discounted fixed price for mocktail roulette", example = "5.50")
        BigDecimal priceMocktail,

        @Schema(description = "Stock bias configuration", example = "BALANCED")
        String stockBias,

        @Schema(description = "Default sound profile", example = "CSGO")
        String soundProfile,

        @Schema(description = "Active wheel sectors configured for the establishment")
        List<RouletteWheelSectorDTO> sectors,

        @Schema(description = "Available spirit filter categories", example = "[\"ALL\", \"GIN\", \"RUM\", \"VODKA\", \"WHISKY\", \"TEQUILA\", \"MOCKTAIL\"]")
        List<String> availableCategories
) {
}
