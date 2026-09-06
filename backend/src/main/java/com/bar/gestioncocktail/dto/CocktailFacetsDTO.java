package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.FlavorProfile;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Facet counts and metadata for interactive catalog filtering by flavor profile and dietary attributes.
 *
 * @param flavorCounts      Count of available drinks per flavor profile tag
 * @param mocktailsCount    Total number of non-alcoholic / mocktail drinks available
 * @param veganCount        Total number of vegan-friendly drinks available
 * @param glutenFreeCount   Total number of gluten-free drinks available
 * @param lowAbvCount       Total number of low-alcohol drinks available (ABV &gt; 0 and &le; 10%)
 * @param minAlcoholLevel   Minimum ABV percentage among catalog cocktails
 * @param maxAlcoholLevel   Maximum ABV percentage among catalog cocktails
 * @param totalAvailable    Total number of active available cocktails
 */
@Schema(description = "Aggregated catalog facet metrics for flavor profile matcher and dietary filter engine")
public record CocktailFacetsDTO(
    @Schema(description = "Count of available drinks per flavor profile tag")
    Map<FlavorProfile, Long> flavorCounts,

    @Schema(description = "Total number of non-alcoholic / mocktail drinks available")
    long mocktailsCount,

    @Schema(description = "Total number of vegan-friendly drinks available")
    long veganCount,

    @Schema(description = "Total number of gluten-free drinks available")
    long glutenFreeCount,

    @Schema(description = "Total number of low-alcohol drinks available (ABV > 0 and <= 10%)")
    long lowAbvCount,

    @Schema(description = "Minimum ABV percentage among catalog cocktails")
    BigDecimal minAlcoholLevel,

    @Schema(description = "Maximum ABV percentage among catalog cocktails")
    BigDecimal maxAlcoholLevel,

    @Schema(description = "Total number of active available cocktails")
    long totalAvailable
) {}
