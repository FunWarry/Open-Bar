package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.InvoiceItemReconciliationStatus;
import com.bar.gestioncocktail.model.SupplierInvoiceItem;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Data Transfer Object representing an individual line on a supplier invoice.
 */
@Schema(description = "Supplier invoice line item details")
public record SupplierInvoiceItemDTO(
        Long id,
        Integer lineNumber,
        String productReference,
        String designation,
        String packaging,
        BigDecimal quantityInvoiced,
        BigDecimal unitPriceHt,
        BigDecimal discountAmount,
        BigDecimal vatRate,
        BigDecimal lineTotalHt,
        BigDecimal lineTotalTtc,
        Long matchedIngredientId,
        String matchedIngredientName,
        Long matchedPoItemId,
        InvoiceItemReconciliationStatus reconciliationStatus,
        String varianceDetails,
        BigDecimal suggestedPackagingCapacity,
        BigDecimal effectiveReceivedQuantity,
        BigDecimal effectiveUnitPriceHt
) {
    /**
     * Converts a {@link SupplierInvoiceItem} entity to its DTO representation.
     *
     * @param item source item entity
     * @return populated DTO, or null if entity is null
     */
    public static SupplierInvoiceItemDTO from(SupplierInvoiceItem item) {
        if (item == null) {
            return null;
        }
        Long ingId = item.getMatchedIngredient() != null ? item.getMatchedIngredient().getId() : null;
        String ingName = item.getMatchedIngredient() != null ? item.getMatchedIngredient().getNom() : null;
        Long poItemId = item.getMatchedPurchaseOrderItem() != null ? item.getMatchedPurchaseOrderItem().getId() : null;

        return new SupplierInvoiceItemDTO(
                item.getId(),
                item.getLineNumber(),
                item.getProductReference(),
                item.getDesignation(),
                item.getPackaging(),
                item.getQuantityInvoiced(),
                item.getUnitPriceHt(),
                item.getDiscountAmount(),
                item.getVatRate(),
                item.getLineTotalHt(),
                item.getLineTotalTtc(),
                ingId,
                ingName,
                poItemId,
                item.getReconciliationStatus(),
                item.getVarianceDetails(),
                item.getSuggestedPackagingCapacity(),
                item.getEffectiveReceivedQuantity(),
                item.getEffectiveUnitPriceHt()
        );
    }
}
