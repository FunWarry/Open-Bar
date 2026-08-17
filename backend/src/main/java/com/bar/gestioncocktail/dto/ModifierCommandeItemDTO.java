package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * DTO representing an item line within an order modification request.
 *
 * @param id Optional identifier of existing order item line
 * @param cocktailId Identifier of the ordered cocktail
 * @param varianteId Optional identifier of the cocktail variant
 * @param quantite Number of drinks ordered
 * @param notes Optional preparation notes or special instructions
 * @param prioritaire Whether this item should be prioritized
 */
@Schema(description = "Item line within an order modification request")
public record ModifierCommandeItemDTO(
    Long id,

    @NotNull(message = "Cocktail identifier is required")
    Long cocktailId,

    Long varianteId,

    @Min(value = 1, message = "Quantity must be at least 1")
    int quantite,

    String notes,
    Boolean prioritaire
) {
}
