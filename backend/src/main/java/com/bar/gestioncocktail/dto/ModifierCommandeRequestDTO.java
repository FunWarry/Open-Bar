package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request DTO for modifying an active order with updated cocktail items, quantities, and notes.
 *
 * @param items List of item lines for the updated order
 * @param notes Optional updated preparation notes
 * @param pourboire Optional updated tip amount
 */
@Schema(description = "Request DTO for modifying an active order")
public record ModifierCommandeRequestDTO(
    @NotEmpty(message = "Order must contain at least one item")
    @Valid
    List<ModifierCommandeItemDTO> items,

    String notes,
    BigDecimal pourboire
) {
}
