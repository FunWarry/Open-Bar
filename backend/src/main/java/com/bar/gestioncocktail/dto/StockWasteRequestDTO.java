package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.StockWasteReason;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request payload for recording a stock waste, breakage, or loss event.
 *
 * @param ingredientId Identifier of the wasted ingredient
 * @param quantity Deducted stock quantity
 * @param reason Declared reason for the shrinkage
 * @param notes Optional description or context
 */
public record StockWasteRequestDTO(
    @NotNull(message = "Ingredient ID is required")
    Long ingredientId,

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.001", message = "Quantity must be greater than zero")
    BigDecimal quantity,

    @NotNull(message = "Waste reason is required")
    StockWasteReason reason,

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    String notes
) {
}
