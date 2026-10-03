package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.RoulettePrizeType;
import com.bar.gestioncocktail.model.RouletteWheelSector;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Output DTO representing a single slice/sector of the Cocktail Roulette Wheel.
 */
@Schema(description = "Sector configuration of the Cocktail Roulette Wheel")
public record RouletteWheelSectorDTO(
        @Schema(description = "Sector ID", example = "1")
        Long id,

        @Schema(description = "Sector display label", example = "Mojito")
        String label,

        @Schema(description = "Reward type", example = "COCKTAIL")
        RoulettePrizeType prizeType,

        @Schema(description = "Associated cocktail ID if prizeType is COCKTAIL", example = "5")
        Long cocktailId,

        @Schema(description = "Associated cocktail name", example = "Mojito")
        String cocktailNom,

        @Schema(description = "Cocktail image URL", example = "https://example.com/mojito.jpg")
        String cocktailImageUrl,

        @Schema(description = "Custom reward text or bartender recipe note", example = "1 Shooter offert au choix")
        String rewardText,

        @Schema(description = "Price override for this sector if any", example = "7.50")
        BigDecimal prix,

        @Schema(description = "Sector sector accent color", example = "var(--primary)")
        String colorHex,

        @Schema(description = "Ionic icon name", example = "wine-outline")
        String iconName,

        @Schema(description = "Relative probability weight", example = "1")
        int probabilityWeight,

        @Schema(description = "Whether this sector is currently active on the wheel", example = "true")
        boolean active,

        @Schema(description = "Display position order on the wheel", example = "0")
        int displayOrder
) {
    /**
     * Maps a {@link RouletteWheelSector} entity to its DTO.
     *
     * @param sector Source entity
     * @return Mapped DTO or null if input is null
     */
    public static RouletteWheelSectorDTO from(RouletteWheelSector sector) {
        if (sector == null) {
            return null;
        }
        BigDecimal effectivePrix = sector.getPrix();
        if (effectivePrix == null && sector.getCocktail() != null) {
            effectivePrix = sector.getCocktail().getPrix();
        }

        return new RouletteWheelSectorDTO(
                sector.getId(),
                sector.getLabel(),
                sector.getPrizeType(),
                sector.getCocktail() != null ? sector.getCocktail().getId() : null,
                sector.getCocktail() != null ? sector.getCocktail().getNom() : null,
                sector.getCocktail() != null ? sector.getCocktail().getImageUrl() : null,
                sector.getRewardText(),
                effectivePrix,
                sector.getColorHex(),
                sector.getIconName(),
                sector.getProbabilityWeight(),
                sector.isActive(),
                sector.getDisplayOrder()
        );
    }
}
