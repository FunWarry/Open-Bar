package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CocktailVarianteIngredient;
import java.math.BigDecimal;

/**
 * Response DTO representing a customized ingredient entry in a cocktail variant.
 *
 * @param id             Identifier of the variant ingredient entry
 * @param ingredientId   Identifier of the referenced ingredient
 * @param ingredientNom  Name of the referenced ingredient
 * @param quantite       Customized dosage quantity
 * @param unite          Unit of measure
 * @param notes          Custom notes
 */
public record CocktailVarianteIngredientResponseDTO(
    Long id,
    Long ingredientId,
    String ingredientNom,
    BigDecimal quantite,
    String unite,
    String notes
) {
    /**
     * Converts a {@link CocktailVarianteIngredient} entity into this response DTO.
     *
     * @param vi The entity to convert
     * @return The response DTO
     */
    public static CocktailVarianteIngredientResponseDTO from(CocktailVarianteIngredient vi) {
        if (vi == null) {
            return null;
        }
        return new CocktailVarianteIngredientResponseDTO(
            vi.getId(),
            vi.getIngredient() != null ? vi.getIngredient().getId() : null,
            vi.getIngredient() != null ? vi.getIngredient().getNom() : null,
            vi.getQuantite(),
            vi.getUnite(),
            vi.getNotes()
        );
    }
}
