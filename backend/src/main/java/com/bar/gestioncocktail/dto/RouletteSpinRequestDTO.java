package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Allergen;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Request payload for spinning the Cocktail Roulette Wheel.
 */
@Schema(description = "Parameters and dietary filters for spinning the roulette wheel")
public record RouletteSpinRequestDTO(
        @Schema(description = "Optional target table identifier", example = "5")
        Long tableId,

        @Schema(description = "Guest session identifier", example = "a3f56e18-6c8a-4d2b-980b-df0e2cf7d1c1")
        String guestSessionId,

        @Schema(description = "Guest display nickname", example = "Alex")
        String guestName,

        @Schema(description = "Preferred spirit category (e.g. ALL, GIN, RUM, VODKA, WHISKY, TEQUILA)", example = "RUM")
        String spiritCategory,

        @Schema(description = "Filter exclusively for non-alcoholic drinks (Mocktails)", example = "false")
        boolean nonAlcoholicOnly,

        @Schema(description = "List of allergens to strictly exclude from eligible recipes")
        List<Allergen> excludedAllergens,

        @Schema(description = "Whether to automatically add the resulting drink to the table cart", example = "false")
        boolean autoAddToCart
) {
}
