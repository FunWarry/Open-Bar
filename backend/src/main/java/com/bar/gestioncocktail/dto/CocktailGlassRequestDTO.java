package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for configuring an individual glassware item in a multi-glass cocktail presentation.
 *
 * @param glasswareId Identifier of the selected glassware entity
 * @param glassOrder  Order index of the glass (1 = Primary, 2 = Secondary/Accompaniment, 3...)
 * @param roleLabel   Custom descriptive label (e.g. 'Verre Principal', 'Shot de Prosecco', 'Chaser bière')
 * @param isPrimary   Whether this glass is the primary serving vessel
 */
@Schema(description = "Request DTO for defining a glass assignment in a multi-glass presentation")
public record CocktailGlassRequestDTO(
    @NotNull(message = "Glassware identifier is required")
    Long glasswareId,

    @NotNull(message = "Glass order is required")
    Integer glassOrder,

    @Size(max = 100, message = "Role label cannot exceed 100 characters")
    String roleLabel,

    Boolean isPrimary
) {
    /**
     * Backward-compatible 3-parameter constructor.
     */
    public CocktailGlassRequestDTO(Long glasswareId, Integer glassOrder, String roleLabel) {
        this(glasswareId, glassOrder, roleLabel, glassOrder != null && glassOrder == 1);
    }
}
