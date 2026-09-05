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
        if (ci == null) {
            return null;
        }
        Long ingId = ci.getIngredient() != null ? ci.getIngredient().getId() : null;
        String ingNom = ci.getIngredient() != null ? ci.getIngredient().getNom() : null;
        String unite = ci.getIngredient() != null ? ci.getIngredient().getUniteMesure() : null;
        return new CocktailIngredientResponseDTO(
            ci.getId(),
            ingId,
            ingNom,
            unite,
            ci.getQuantite(),
            ci.getNotes()
        );
    }
}
