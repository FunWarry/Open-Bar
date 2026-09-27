package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.InventoryAuditSession;
import com.bar.gestioncocktail.model.InventoryAuditStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Data Transfer Object representing an inventory audit session with metadata, status, and line items.
 *
 * @param id Unique identifier of the session
 * @param referenceCode Formatted reference code (e.g. INV-20260927-001)
 * @param title Human-readable audit session title
 * @param status Current lifecycle status (DRAFT, IN_PROGRESS, FINALIZED, CANCELLED)
 * @param storageLocationScope Scope of storage locations audited (e.g. ALL or specific location)
 * @param categoryScope Category filter applied during audit initialization
 * @param createdByUsername Staff member who created the audit session
 * @param finalizedByUsername Staff member who approved and finalized the audit
 * @param createdAt Creation timestamp
 * @param startedAt Timestamp when counting began
 * @param finalizedAt Timestamp when audit was approved and stock adjusted
 * @param notes General notes and observations
 * @param totalTheoreticalValueHt Total theoretical stock value HT
 * @param totalCountedValueHt Total physically counted stock value HT
 * @param totalVarianceValueHt Total net variance value HT (negative = net shrinkage)
 * @param totalItemsCount Total number of ingredients included in the audit
 * @param countedItemsCount Number of ingredients that have recorded physical counts
 * @param items Detailed audited line items
 */
public record InventoryAuditSessionResponseDTO(
        Long id,
        String referenceCode,
        String title,
        InventoryAuditStatus status,
        String storageLocationScope,
        String categoryScope,
        String createdByUsername,
        String finalizedByUsername,
        LocalDateTime createdAt,
        LocalDateTime startedAt,
        LocalDateTime finalizedAt,
        String notes,
        BigDecimal totalTheoreticalValueHt,
        BigDecimal totalCountedValueHt,
        BigDecimal totalVarianceValueHt,
        int totalItemsCount,
        int countedItemsCount,
        List<InventoryAuditItemResponseDTO> items
) {
    /**
     * Converts a JPA {@link InventoryAuditSession} entity into its corresponding response DTO.
     *
     * @param entity The source audit session entity
     * @return Transformed DTO or null if source is null
     */
    public static InventoryAuditSessionResponseDTO from(InventoryAuditSession entity) {
        if (entity == null) {
            return null;
        }
        List<InventoryAuditItemResponseDTO> itemDTOs = entity.getItems() != null
                ? entity.getItems().stream().map(InventoryAuditItemResponseDTO::from).toList()
                : Collections.emptyList();

        int countedCount = 0;
        if (entity.getItems() != null) {
            for (var item : entity.getItems()) {
                if (item.getCountedQuantity() != null) {
                    countedCount++;
                }
            }
        }

        return new InventoryAuditSessionResponseDTO(
                entity.getId(),
                entity.getReferenceCode(),
                entity.getTitle(),
                entity.getStatus(),
                entity.getStorageLocationScope(),
                entity.getCategoryScope(),
                entity.getCreatedBy() != null ? entity.getCreatedBy().getUsername() : null,
                entity.getFinalizedBy() != null ? entity.getFinalizedBy().getUsername() : null,
                entity.getCreatedAt(),
                entity.getStartedAt(),
                entity.getFinalizedAt(),
                entity.getNotes(),
                entity.getTotalTheoreticalValueHt(),
                entity.getTotalCountedValueHt(),
                entity.getTotalVarianceValueHt(),
                entity.getItems() != null ? entity.getItems().size() : 0,
                countedCount,
                itemDTOs
        );
    }
}
