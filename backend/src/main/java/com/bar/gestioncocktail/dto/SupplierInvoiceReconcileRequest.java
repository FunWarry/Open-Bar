package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Request payload for saving reconciliation adjustments and linking an invoice to a purchase order.
 */
@Schema(description = "Payload for reconciling a supplier invoice with purchase orders and catalog ingredients")
public record SupplierInvoiceReconcileRequest(
        Long purchaseOrderId,
        String reconciliationNotes,
        List<SupplierInvoiceItemReconcileAdjustment> itemAdjustments
) {
}
