package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

/**
 * Data Transfer Object representing the financial margin and recipe cost metrics for a cocktail variant.
 *
 * @param varianteId             Variant unique identifier
 * @param nom                    Variant name (e.g., Virgin, Double, Spicy)
 * @param prixTTC                Selling price including VAT in EUR
 * @param prixHT                 Selling price excluding VAT in EUR
 * @param recipeCost             Total recipe unit cost of goods sold (COGS) in EUR
 * @param grossMargin            Gross margin amount in EUR (prixHT - recipeCost)
 * @param grossMarginPercentage  Gross margin percentage ((grossMargin / prixHT) * 100)
 * @param ingredients            Itemized recipe ingredients cost breakdown
 */
@Schema(description = "Financial margin and cost metrics for a cocktail variant")
public record CocktailVarianteMarginDTO(
    @Schema(description = "Variant ID", example = "5")
    Long varianteId,

    @Schema(description = "Variant name", example = "Virgin Mojito")
    String nom,

    @Schema(description = "Price including VAT in EUR", example = "8.50")
    BigDecimal prixTTC,

    @Schema(description = "Price excluding VAT in EUR", example = "7.08")
    BigDecimal prixHT,

    @Schema(description = "Total recipe cost in EUR", example = "1.20")
    BigDecimal recipeCost,

    @Schema(description = "Gross margin amount in EUR", example = "5.88")
    BigDecimal grossMargin,

    @Schema(description = "Gross margin percentage", example = "83.05")
    BigDecimal grossMarginPercentage,

    @Schema(description = "Itemized ingredient costs")
    List<RecipeIngredientCostDTO> ingredients
) {}
