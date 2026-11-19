package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.PurchaseOrderStatus;
import com.bar.gestioncocktail.model.SupplierInvoiceStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;

/**
 * High-level reconciliation comparison DTO matching a supplier invoice with candidate and selected purchase orders.
 */
@Schema(description = "Invoice-to-purchase-order reconciliation snapshot")
public record SupplierInvoiceReconciliationDTO(
        Long invoiceId,
        String invoiceNumber,
        Long supplierId,
        String supplierName,
        Long selectedPurchaseOrderId,
        String selectedPurchaseOrderReference,
        PurchaseOrderStatus selectedPurchaseOrderStatus,
        BigDecimal invoicedTotalHt,
        BigDecimal orderedTotalHt,
        BigDecimal totalHtVariance,
        SupplierInvoiceStatus status,
        List<PurchaseOrderDTO> candidatePurchaseOrders,
        List<ReconciliationLineDiffDTO> lines,
        boolean canAutoApply,
        List<String> reconciliationWarnings
) {
}
