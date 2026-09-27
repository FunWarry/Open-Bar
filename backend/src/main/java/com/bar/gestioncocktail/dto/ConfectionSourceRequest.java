package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request DTO for creating or updating a confection source mapping on a crafted ingredient.
 *
 * @param sourceIngredientId Identifier of the source ingredient
 * @param yieldRatio         How many crafted units are produced from 1 source unit
 * @param yieldUnit          Unit of the yield output
 * @param notes              Optional notes about this confection mapping
 */
@Schema(description = "Confection source mapping creation/update request")
public record ConfectionSourceRequest(
    @NotNull(message = "Source ingredient ID is required")
    @Schema(description = "Identifier of the source ingredient")
    Long sourceIngredientId,

    @NotNull(message = "Yield ratio is required")
    @DecimalMin(value = "0.0001", message = "Yield ratio must be positive")
    @Schema(description = "Yield ratio: crafted units produced per 1 source unit")
    BigDecimal yieldRatio,

    @Schema(description = "Unit of the yield output (should match crafted ingredient unit)")
    String yieldUnit,

    @Schema(description = "Optional notes about the confection process")
    String notes
) {
}
