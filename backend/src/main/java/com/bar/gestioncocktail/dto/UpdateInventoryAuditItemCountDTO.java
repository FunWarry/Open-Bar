package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Payload for updating physical count entries for a specific ingredient line item and storage location.
 *
 * @param storageLocation Storage location where count took place (e.g. Main Bar, Back Bar, Wine Cellar, Keg Room)
 * @param fullContainersCount Number of full unopened bottles/kegs
 * @param partialQuantity Partial open bottle fraction (0.25, 0.5, 0.75) or exact volume/weight
 * @param notes Optional notes explaining discrepancy or count remarks
 */
public record UpdateInventoryAuditItemCountDTO(
        @NotBlank(message = "Storage location is required")
        String storageLocation,

        @NotNull(message = "Full containers count cannot be null")
        Integer fullContainersCount,

        @DecimalMin(value = "0.0", message = "Partial quantity cannot be negative")
        BigDecimal partialQuantity,

        String notes
) {
}
