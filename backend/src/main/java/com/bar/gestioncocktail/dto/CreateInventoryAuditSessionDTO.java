package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for creating a new periodic physical stock inventory audit session.
 *
 * @param title Human-readable audit title (e.g. "Inventaire mensuel Bar & Cave - Fin Septembre")
 * @param storageLocationScope Storage locations scope (e.g. "ALL" or specific room)
 * @param categoryScope Optional ingredient category filter (null for all categories)
 * @param notes Initial context or instructions for counters
 */
public record CreateInventoryAuditSessionDTO(
        @NotBlank(message = "Audit title is required")
        @Size(max = 255, message = "Title cannot exceed 255 characters")
        String title,

        String storageLocationScope,
        String categoryScope,
        String notes
) {
}
