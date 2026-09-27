package com.bar.gestioncocktail.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/**
 * Request payload for saving multiple inventory count sheet rows in a single batch operation.
 *
 * @param counts List of item count updates
 */
public record BatchUpdateItemCountsDTO(
        @NotEmpty(message = "Batch counts list cannot be empty")
        List<@Valid BatchItemCountEntryDTO> counts
) {
    /**
     * Individual line update within a batch count payload.
     *
     * @param auditItemId Unique identifier of the inventory audit line item
     * @param storageLocation Storage location of the counted stock
     * @param fullContainersCount Number of full containers
     * @param partialQuantity Partial open bottle volume or fraction
     * @param notes Optional remarks
     */
    public record BatchItemCountEntryDTO(
            @NotNull(message = "Audit item ID is required")
            Long auditItemId,

            @NotNull(message = "Storage location is required")
            String storageLocation,

            Integer fullContainersCount,
            BigDecimal partialQuantity,
            String notes
    ) {
    }
}
