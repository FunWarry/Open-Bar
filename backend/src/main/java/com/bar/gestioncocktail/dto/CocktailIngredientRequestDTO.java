package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.Ingredient;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request DTO for creating a cocktail-ingredient recipe link.
 *
 * @param cocktailId   Identifier of the cocktail
 * @param ingredientId Identifier of the ingredient
 * @param quantite     Required quantity of the ingredient
 * @param notes        Optional preparation notes
 */
public record CocktailIngredientRequestDTO(
    @NotNull(message = "Cocktail is required")
    Long cocktailId,

    @NotNull(message = "Ingredient is required")
    Long ingredientId,

    @NotNull(message = "Quantity is required")
    BigDecimal quantite,

    String notes
) {
    /**
     * Converts this DTO into a {@link CocktailIngredient} JPA entity.
     *
     * @return A new {@link CocktailIngredient} entity instance
     */
    public CocktailIngredient toEntity() {
        CocktailIngredient ci = new CocktailIngredient();
        if (cocktailId != null) {
            Cocktail cocktail = new Cocktail();
            cocktail.setId(cocktailId);
            ci.setCocktail(cocktail);
        }
        if (ingredientId != null) {
            Ingredient ingredient = new Ingredient();
            ingredient.setId(ingredientId);
            ci.setIngredient(ingredient);
        }
        ci.setQuantite(quantite);
        ci.setNotes(notes);
        return ci;
    }
}
