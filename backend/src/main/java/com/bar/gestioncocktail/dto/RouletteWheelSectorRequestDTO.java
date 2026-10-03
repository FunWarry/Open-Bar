package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.RoulettePrizeType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request payload for creating or updating a sector of the Cocktail Roulette Wheel.
 */
@Schema(description = "Request payload to create or update a wheel sector")
public record RouletteWheelSectorRequestDTO(
        @NotBlank(message = "Label is required")
        @Size(max = 100, message = "Label cannot exceed 100 characters")
        @Schema(description = "Sector display label", example = "Mojito Passion")
        String label,

        @NotNull(message = "Prize type is required")
        @Schema(description = "Reward prize type", example = "COCKTAIL")
        RoulettePrizeType prizeType,

        @Schema(description = "Associated cocktail ID if prizeType is COCKTAIL", example = "3")
        Long cocktailId,

        @Size(max = 255, message = "Reward text cannot exceed 255 characters")
        @Schema(description = "Custom reward text or notes", example = "Shooter offert au choix")
        String rewardText,

        @Schema(description = "Optional custom price", example = "7.50")
        BigDecimal prix,

        @Size(max = 30, message = "Color code cannot exceed 30 characters")
        @Schema(description = "Color token or hex code", example = "#ec4899")
        String colorHex,

        @Size(max = 50, message = "Icon name cannot exceed 50 characters")
        @Schema(description = "Ionic icon name", example = "wine-outline")
        String iconName,

        @Min(value = 1, message = "Probability weight must be at least 1")
        @Schema(description = "Relative probability weight", example = "1")
        int probabilityWeight,

        @Schema(description = "Whether the sector is active", example = "true")
        boolean active,

        @Schema(description = "Display position order", example = "1")
        int displayOrder
) {
}
