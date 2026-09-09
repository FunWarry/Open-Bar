package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Allergen;
import com.bar.gestioncocktail.model.CocktailIngredient;
import java.math.BigDecimal;
import java.util.Set;

/**
 * Response DTO describing an ingredient used within a cocktail recipe.
 *
 * @param id            Unique link identifier
 * @param ingredientId  Target ingredient ID
 * @param ingredientNom Target ingredient name
 * @param uniteMesure   Recipe measurement unit
 * @param quantite      Measurement quantity
 * @param notes         Preparation notes
 * @param allergens     Set of allergens present in this ingredient
 */
public record CocktailIngredientResponseDTO(
    Long id,
    Long ingredientId,
    String ingredientNom,
    String uniteMesure,
    BigDecimal quantite,
    String notes,
    Set<Allergen> allergens
) {
    /**
     * Backward-compatible 6-parameter constructor without allergens.
     */
    public CocktailIngredientResponseDTO(
        Long id,
        Long ingredientId,
        String ingredientNom,
        String uniteMesure,
        BigDecimal quantite,
        String notes
    ) {
        this(id, ingredientId, ingredientNom, uniteMesure, quantite, notes, Set.of());
    }

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
        Set<Allergen> allergens = ci.getIngredient() != null && ci.getIngredient().getAllergens() != null
            ? ci.getIngredient().getAllergens()
            : Set.of();
        return new CocktailIngredientResponseDTO(
            ci.getId(),
            ingId,
            ingNom,
            unite,
            ci.getQuantite(),
            ci.getNotes(),
            allergens
        );
    }
}
