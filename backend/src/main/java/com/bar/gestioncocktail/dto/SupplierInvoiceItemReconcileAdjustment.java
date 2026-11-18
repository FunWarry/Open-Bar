package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Adjustment payload for manual line item mapping and quantity/price correction during invoice reconciliation.
 */
@Schema(description = "Manual adjustment or mapping for an individual invoice line item")
public record SupplierInvoiceItemReconcileAdjustment(
        Long itemId,
        Long matchedIngredientId,
        Long matchedPoItemId,
        BigDecimal effectiveReceivedQuantity,
        BigDecimal effectiveUnitPriceHt,
        BigDecimal packagingCapacity
) {
}
