package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

/**
 * Data Transfer Object representing the cost breakdown of an individual ingredient in a cocktail recipe.
 *
 * @param ingredientId       Unique identifier of the ingredient
 * @param nom                Name of the ingredient
 * @param quantiteRecette    Quantity required by the recipe
 * @param uniteRecette       Measurement unit in the recipe
 * @param prixUnitaireAchat  Unit purchase cost of the ingredient in inventory
 * @param uniteMesureAchat   Inventory unit of measurement (e.g., L, cl, kg, piece)
 * @param coutTotalLigne     Total calculated cost for this recipe ingredient line in EUR
 */
@Schema(description = "Itemized ingredient cost breakdown in a cocktail recipe")
public record RecipeIngredientCostDTO(
    @Schema(description = "Ingredient ID", example = "12")
    Long ingredientId,

    @Schema(description = "Ingredient name", example = "Rhum blanc")
    String nom,

    @Schema(description = "Recipe required quantity", example = "5.0")
    BigDecimal quantiteRecette,

    @Schema(description = "Recipe measurement unit", example = "cl")
    String uniteRecette,

    @Schema(description = "Unit purchase cost in inventory", example = "20.00")
    BigDecimal prixUnitaireAchat,

    @Schema(description = "Inventory purchasing unit", example = "L")
    String uniteMesureAchat,

    @Schema(description = "Total line cost for this recipe in EUR", example = "1.00")
    BigDecimal coutTotalLigne
) {}
