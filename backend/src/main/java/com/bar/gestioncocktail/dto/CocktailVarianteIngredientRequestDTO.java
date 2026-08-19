package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Request payload for creating or updating a customized ingredient in a cocktail variant.
 *
 * @param ingredientId Identifier of the referenced ingredient
 * @param quantite     Custom dosage quantity
 * @param unite        Unit of measure (e.g. "cl", "g", "feuille", "trait")
 * @param notes        Optional preparation or substitution notes
 */
public record CocktailVarianteIngredientRequestDTO(
    @NotNull(message = "L'ingrédient est obligatoire")
    Long ingredientId,

    @NotNull(message = "La quantité est obligatoire")
    BigDecimal quantite,

    String unite,
    String notes
) {
}
