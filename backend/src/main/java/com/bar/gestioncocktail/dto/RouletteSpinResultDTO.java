package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.RoulettePrizeType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;

/**
 * Result payload returned when a roulette wheel spin is resolved.
 */
@Schema(description = "Outcome of a cocktail roulette wheel spin")
public record RouletteSpinResultDTO(
        @Schema(description = "Winning sector ID", example = "3")
        Long sectorId,

        @Schema(description = "Zero-based index of the winning slice on the wheel", example = "2")
        int winningIndex,

        @Schema(description = "Reward type", example = "COCKTAIL")
        RoulettePrizeType prizeType,

        @Schema(description = "Winning cocktail ID if applicable", example = "12")
        Long cocktailId,

        @Schema(description = "Winning drink or reward title", example = "Mojito Framboise")
        String cocktailNom,

        @Schema(description = "Drink description or preparation highlight", example = "Fresh mint, lime, white rum, raspberry purée")
        String cocktailDescription,

        @Schema(description = "Image URL of the winning cocktail", example = "https://example.com/cocktail.jpg")
        String cocktailImageUrl,

        @Schema(description = "Discounted mystery drink price", example = "7.50")
        BigDecimal prix,

        @Schema(description = "Custom reward text if applicable", example = "1 Tournée de shooters offerte")
        String rewardText,

        @Schema(description = "Preparation guidance note for the bartender", example = "Création du barman basée sur Rhum & purée passion")
        String barmanNotes,

        @Schema(description = "Flag identifying this line as a mystery drink", example = "true")
        boolean isMysteryDrink,

        @Schema(description = "Whether this drink was automatically appended to the active table cart", example = "true")
        boolean addedToCart,

        @Schema(description = "Full list of wheel sectors matching this spin for rendering the wheel animation")
        List<RouletteWheelSectorDTO> activeSectors
) {
}
