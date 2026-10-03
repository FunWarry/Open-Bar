package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.InventoryAuditLocationCount;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data Transfer Object representing a single location count entry in an inventory audit line item.
 *
 * @param id Unique identifier of the location count record
 * @param storageLocation Storage room or bar area (e.g. Main Bar, Back Bar, Wine Cellar, Keg Room)
 * @param fullContainersCount Number of full, unopened containers or bottles counted
 * @param partialQuantity Quantity from opened or partial containers (e.g. fraction or volume/weight)
 * @param countedQuantity Total physical quantity aggregated for this location
 * @param notes Optional notes or observations recorded by the counter
 * @param countedAt Timestamp when this location count was registered
 * @param countedByUsername Username of the staff member who performed the count
 */
public record InventoryAuditLocationCountDTO(
        Long id,
        String storageLocation,
        Integer fullContainersCount,
        BigDecimal partialQuantity,
        BigDecimal countedQuantity,
        String notes,
        LocalDateTime countedAt,
        String countedByUsername
) {
    /**
     * Converts a JPA {@link InventoryAuditLocationCount} entity into its corresponding DTO.
     *
     * @param entity The source entity
     * @return Transformed DTO or null if source is null
     */
    public static InventoryAuditLocationCountDTO from(InventoryAuditLocationCount entity) {
        if (entity == null) {
            return null;
        }
        return new InventoryAuditLocationCountDTO(
                entity.getId(),
                entity.getStorageLocation(),
                entity.getFullContainersCount(),
                entity.getPartialQuantity(),
                entity.getCountedQuantity(),
                entity.getNotes(),
                entity.getCountedAt(),
                entity.getCountedBy() != null ? entity.getCountedBy().getUsername() : null
        );
    }
}
