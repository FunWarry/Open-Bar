package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CocktailIngredient;
import java.math.BigDecimal;

public record CocktailIngredientResponseDTO(
    Long id,
    Long ingredientId,
    String ingredientNom,
    String uniteMesure,
    BigDecimal quantite,
    String notes
) {
    public static CocktailIngredientResponseDTO from(CocktailIngredient ci) {
        return new CocktailIngredientResponseDTO(
            ci.getId(),
            ci.getIngredient().getId(),
            ci.getIngredient().getNom(),
            ci.getIngredient().getUniteMesure(),
            ci.getQuantite(),
            ci.getNotes()
        );
    }
}
