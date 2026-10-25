package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CocktailGlass;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Response DTO describing a glassware assignment in a multi-glass cocktail presentation.
 *
 * @param id          Unique link identifier
 * @param cocktailId  Identifier of the associated cocktail
 * @param glassware   Serving glassware details
 * @param glassOrder  Order index of the glass (1 = Primary, 2 = Secondary, 3...)
 * @param roleLabel   Custom descriptive label (e.g. 'Coupe Martini', 'Shot de Prosecco')
 * @param isPrimary   Whether this glass is the primary serving vessel
 */
@Schema(description = "DTO representation of a glass assignment in a multi-glass presentation")
public record CocktailGlassResponseDTO(
    Long id,
    Long cocktailId,
    GlasswareResponseDTO glassware,
    Integer glassOrder,
    String roleLabel,
    boolean isPrimary
) {
    /**
     * Converts a {@link CocktailGlass} entity into a response DTO.
     *
     * @param cg Source cocktail glass entity
     * @return Corresponding response DTO
     */
    public static CocktailGlassResponseDTO from(CocktailGlass cg) {
        if (cg == null) {
            return null;
        }
        return new CocktailGlassResponseDTO(
            cg.getId(),
            cg.getCocktail() != null ? cg.getCocktail().getId() : null,
            GlasswareResponseDTO.from(cg.getGlassware()),
            cg.getGlassOrder(),
            cg.getRoleLabel(),
            cg.isPrimary()
        );
    }
}
