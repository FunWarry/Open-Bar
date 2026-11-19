package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.InvoiceItemReconciliationStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Detailed line-level reconciliation diff between an invoiced item and its corresponding purchase order item.
 */
@Schema(description = "Line item reconciliation discrepancy details")
public record ReconciliationLineDiffDTO(
        Long invoiceItemId,
        Integer lineNumber,
        String designation,
        String productReference,
        String packaging,
        BigDecimal quantityInvoiced,
        BigDecimal quantityOrdered,
        BigDecimal quantityDelivered,
        BigDecimal quantityVariance,
        BigDecimal unitPriceInvoiced,
        BigDecimal unitPriceOrdered,
        BigDecimal priceVarianceAmount,
        BigDecimal priceVariancePercent,
        InvoiceItemReconciliationStatus status,
        Long matchedIngredientId,
        String matchedIngredientName,
        Long matchedPoItemId,
        boolean isNewOrUnrecognized,
        String varianceDetails
) {
}
