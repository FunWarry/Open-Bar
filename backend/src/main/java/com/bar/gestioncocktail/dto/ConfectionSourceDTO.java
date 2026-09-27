package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.IngredientConfectionSource;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Response DTO describing a confection source mapping for a crafted ingredient.
 *
 * @param sourceIngredientId   Identifier of the source ingredient
 * @param sourceIngredientNom  Name of the source ingredient
 * @param sourceIngredientUnit Unit of measure of the source ingredient
 * @param yieldRatio           How many crafted units are produced from 1 source unit
 * @param yieldUnit            Unit of the yield output
 * @param notes                Optional notes about this confection mapping
 */
@Schema(description = "Confection source mapping for a crafted ingredient")
public record ConfectionSourceDTO(
    @Schema(description = "Identifier of the source ingredient")
    Long sourceIngredientId,

    @Schema(description = "Name of the source ingredient")
    String sourceIngredientNom,

    @Schema(description = "Unit of measure of the source ingredient")
    String sourceIngredientUnit,

    @Schema(description = "Yield ratio: crafted units produced per 1 source unit")
    BigDecimal yieldRatio,

    @Schema(description = "Unit of the yield output")
    String yieldUnit,

    @Schema(description = "Optional notes about the confection process")
    String notes
) {
    /**
     * Maps an {@link IngredientConfectionSource} entity to this response DTO.
     *
     * @param source the confection source entity
     * @return the response DTO
     */
    public static ConfectionSourceDTO from(IngredientConfectionSource source) {
        if (source == null) {
            return null;
        }
        return new ConfectionSourceDTO(
            source.getSourceIngredient() != null ? source.getSourceIngredient().getId() : null,
            source.getSourceIngredient() != null ? source.getSourceIngredient().getNom() : null,
            source.getSourceIngredient() != null ? source.getSourceIngredient().getUniteMesure() : null,
            source.getYieldRatio(),
            source.getYieldUnit(),
            source.getNotes()
        );
    }
}
