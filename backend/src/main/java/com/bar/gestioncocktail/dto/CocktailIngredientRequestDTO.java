package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.Ingredient;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request DTO for creating a cocktail-ingredient recipe link.
 *
 * @param cocktailId       Identifier of the cocktail
 * @param ingredientId     Identifier of the ingredient
 * @param quantite         Required quantity of the ingredient
 * @param unite            Optional recipe unit of measure (e.g. cl, g, piece)
 * @param targetGlassOrder Glass order index (1 = Primary glass, 2 = Secondary glass, etc.)
 * @param notes            Optional preparation notes
 */
public record CocktailIngredientRequestDTO(
    @NotNull(message = "Cocktail is required")
    Long cocktailId,

    @NotNull(message = "Ingredient is required")
    Long ingredientId,

    @NotNull(message = "Quantity is required")
    BigDecimal quantite,

    String unite,

    Integer targetGlassOrder,

    String notes
) {
    /**
     * Backward-compatible 5-parameter constructor without targetGlassOrder.
     */
    public CocktailIngredientRequestDTO(Long cocktailId, Long ingredientId, BigDecimal quantite, String unite, String notes) {
        this(cocktailId, ingredientId, quantite, unite, 1, notes);
    }

    /**
     * Backward-compatible 4-parameter constructor without recipe unit and targetGlassOrder.
     */
    public CocktailIngredientRequestDTO(Long cocktailId, Long ingredientId, BigDecimal quantite, String notes) {
        this(cocktailId, ingredientId, quantite, null, 1, notes);
    }

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
        ci.setUnite(unite);
        ci.setTargetGlassOrder(targetGlassOrder != null ? targetGlassOrder : 1);
        ci.setNotes(notes);
        return ci;
    }
}
