package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.InventoryAuditItem;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

/**
 * Data Transfer Object representing an audited inventory ingredient item with theoretical vs physical counts.
 *
 * @param id Unique identifier of the audit line item
 * @param ingredientId Identifier of the audited ingredient
 * @param ingredientNom Name of the audited ingredient
 * @param ingredientUnite Unit of measure (cl, ml, bottle, piece, etc.)
 * @param ingredientCategory Family category (spirits, liqueurs, wines, beers, etc.)
 * @param packagingCapacity Container capacity (e.g. 70.0 for 70cl bottle)
 * @param theoreticalQuantity Snapshot of active theoretical stock at audit inception
 * @param countedQuantity Verified physical quantity counted (null if not yet counted)
 * @param varianceQuantity Discrepancy between counted and theoretical stock (counted - theoretical)
 * @param unitCostHt Unit replacement cost HT (PAMP or prixUnitaire)
 * @param theoreticalValueHt Financial value HT of the theoretical stock
 * @param countedValueHt Financial value HT of the physically counted stock
 * @param varianceValueHt Financial variance HT (negative represents shrinkage / financial loss)
 * @param notes Auditor notes or reason for discrepancy
 * @param locationCounts Detailed breakdown of counts across storage locations
 */
public record InventoryAuditItemResponseDTO(
        Long id,
        Long ingredientId,
        String ingredientNom,
        String ingredientUnite,
        String ingredientCategory,
        BigDecimal packagingCapacity,
        BigDecimal theoreticalQuantity,
        BigDecimal countedQuantity,
        BigDecimal varianceQuantity,
        BigDecimal unitCostHt,
        BigDecimal theoreticalValueHt,
        BigDecimal countedValueHt,
        BigDecimal varianceValueHt,
        String notes,
        List<InventoryAuditLocationCountDTO> locationCounts
) {
    /**
     * Converts a JPA {@link InventoryAuditItem} entity into its corresponding response DTO.
     *
     * @param entity The source line item entity
     * @return Transformed DTO or null if source is null
     */
    public static InventoryAuditItemResponseDTO from(InventoryAuditItem entity) {
        if (entity == null) {
            return null;
        }
        List<InventoryAuditLocationCountDTO> locList = entity.getLocationCounts() != null
                ? entity.getLocationCounts().stream().map(InventoryAuditLocationCountDTO::from).toList()
                : Collections.emptyList();

        return new InventoryAuditItemResponseDTO(
                entity.getId(),
                entity.getIngredient() != null ? entity.getIngredient().getId() : null,
                entity.getIngredient() != null ? entity.getIngredient().getNom() : null,
                entity.getIngredient() != null ? entity.getIngredient().getUniteMesure() : null,
                entity.getIngredient() != null ? entity.getIngredient().getCategory() : null,
                entity.getIngredient() != null ? entity.getIngredient().getPackagingCapacity() : null,
                entity.getTheoreticalQuantity(),
                entity.getCountedQuantity(),
                entity.getVarianceQuantity(),
                entity.getUnitCostHt(),
                entity.getTheoreticalValueHt(),
                entity.getCountedValueHt(),
                entity.getVarianceValueHt(),
                entity.getNotes(),
                locList
        );
    }
}
