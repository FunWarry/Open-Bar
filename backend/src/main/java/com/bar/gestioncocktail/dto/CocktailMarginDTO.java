package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

/**
 * Data Transfer Object representing detailed gross profit margin, COGS, and pricing analytics for a cocktail.
 *
 * @param cocktailId             Unique cocktail identifier
 * @param nom                    Commercial drink title
 * @param categorie              Cocktail category
 * @param vatRateLabel           Applicable VAT rate label (e.g. 20%)
 * @param prixTTC                Selling price including VAT in EUR
 * @param prixHT                 Selling price excluding VAT in EUR
 * @param recipeCost             Total recipe unit cost of goods sold (COGS) in EUR
 * @param grossMargin            Gross margin amount in EUR (prixHT - recipeCost)
 * @param grossMarginPercentage  Gross margin percentage ((grossMargin / prixHT) * 100)
 * @param ingredients            Itemized recipe ingredients cost breakdown
 * @param variantes              Margin metrics for all custom variants
 */
@Schema(description = "Detailed gross profit margin, COGS, and pricing metrics for a cocktail")
public record CocktailMarginDTO(
    @Schema(description = "Cocktail ID", example = "1")
    Long cocktailId,

    @Schema(description = "Cocktail title", example = "Mojito")
    String nom,

    @Schema(description = "Cocktail category", example = "ALCOOLISE")
    String categorie,

    @Schema(description = "Applicable VAT rate label", example = "20%")
    String vatRateLabel,

    @Schema(description = "Price including VAT in EUR", example = "9.50")
    BigDecimal prixTTC,

    @Schema(description = "Price excluding VAT in EUR", example = "7.92")
    BigDecimal prixHT,

    @Schema(description = "Total recipe cost in EUR", example = "1.55")
    BigDecimal recipeCost,

    @Schema(description = "Gross margin amount in EUR", example = "6.37")
    BigDecimal grossMargin,

    @Schema(description = "Gross margin percentage", example = "80.43")
    BigDecimal grossMarginPercentage,

    @Schema(description = "Itemized ingredient costs")
    List<RecipeIngredientCostDTO> ingredients,

    @Schema(description = "Margins for all cocktail variants")
    List<CocktailVarianteMarginDTO> variantes
) {}
