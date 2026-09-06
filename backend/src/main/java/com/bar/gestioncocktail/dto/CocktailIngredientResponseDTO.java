package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CocktailIngredient;
import java.math.BigDecimal;

/**
 * Response DTO describing an ingredient used within a cocktail recipe.
 *
 * @param id            Unique link identifier
 * @param ingredientId  Target ingredient ID
 * @param ingredientNom Target ingredient name
 * @param uniteMesure   Recipe measurement unit
 * @param quantite      Measurement quantity
 * @param notes         Preparation notes
 */
public record CocktailIngredientResponseDTO(
    Long id,
    Long ingredientId,
    String ingredientNom,
    String uniteMesure,
    BigDecimal quantite,
    String notes
) {
    /**
     * Converts a {@link CocktailIngredient} entity into a response DTO.
     *
     * @param ci Source cocktail ingredient link
     * @return Corresponding response DTO
     */
    public static CocktailIngredientResponseDTO from(CocktailIngredient ci) {
        if (ci == null) {
            return null;
        }
        Long ingId = ci.getIngredient() != null ? ci.getIngredient().getId() : null;
        String ingNom = ci.getIngredient() != null ? ci.getIngredient().getNom() : null;
        String unite = ci.getUnite();
        if (unite == null || unite.isBlank()) {
            unite = ci.getIngredient() != null ? ci.getIngredient().getUniteMesure() : null;
        }
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
