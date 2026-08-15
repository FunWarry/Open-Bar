package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Data Transfer Object representing top selling cocktail metrics.
 *
 * @param cocktailId Unique identifier of the cocktail
 * @param nom Name of the cocktail
 * @param nombreCommandes Number of units ordered today
 */
@Schema(description = "Top selling cocktail sales volume metric")
public record TopCocktailDTO(
    @Schema(description = "Cocktail identifier", example = "10")
    Long cocktailId,
    @Schema(description = "Cocktail name", example = "Mojito")
    String nom,
    @Schema(description = "Number of orders", example = "15")
    long nombreCommandes
) {}

