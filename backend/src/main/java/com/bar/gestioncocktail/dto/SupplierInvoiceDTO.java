package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.SupplierInvoice;
import com.bar.gestioncocktail.model.SupplierInvoiceComplianceStatus;
import com.bar.gestioncocktail.model.SupplierInvoiceFormat;
import com.bar.gestioncocktail.model.SupplierInvoiceStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Data Transfer Object representing a digital supplier invoice with its line items and reconciliation state.
 */
@Schema(description = "Supplier invoice representation")
public record SupplierInvoiceDTO(
        Long id,
        String invoiceNumber,
        Long supplierId,
        String supplierName,
        String supplierNameRaw,
        String supplierSiren,
        String supplierSiret,
        String supplierVatNumber,
        String customerName,
        String customerSiren,
        LocalDate invoiceDate,
        LocalDate dueDate,
        LocalDate deliveryDate,
        String orderReference,
        String deliveryNoteReference,
        BigDecimal totalHt,
        BigDecimal totalVat,
        BigDecimal totalTtc,
        String currency,
        SupplierInvoiceStatus status,
        SupplierInvoiceFormat format,
        String profile,
        String fileName,
        String fileChecksum,
        SupplierInvoiceComplianceStatus legalComplianceStatus,
        String complianceDetails,
        String reconciliationNotes,
        Long purchaseOrderId,
        String purchaseOrderReference,
        Long deliveryId,
        Long reviewedById,
        String reviewedByUsername,
        LocalDateTime reviewedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<SupplierInvoiceItemDTO> items
) {
    /**
     * Converts a {@link SupplierInvoice} entity to its DTO representation.
     *
     * @param invoice source invoice entity
     * @return populated DTO, or null if entity is null
     */
    public static SupplierInvoiceDTO from(SupplierInvoice invoice) {
        if (invoice == null) {
            return null;
        }

        Long sId = invoice.getSupplier() != null ? invoice.getSupplier().getId() : null;
        String sName = invoice.getSupplier() != null ? invoice.getSupplier().getNom() : invoice.getSupplierNameRaw();
        Long poId = invoice.getPurchaseOrder() != null ? invoice.getPurchaseOrder().getId() : null;
        String poRef = invoice.getPurchaseOrder() != null ? invoice.getPurchaseOrder().getReference() : invoice.getOrderReference();
        Long delivId = invoice.getDelivery() != null ? invoice.getDelivery().getId() : null;
        Long revById = invoice.getReviewedBy() != null ? invoice.getReviewedBy().getId() : null;
        String revByUsername = invoice.getReviewedBy() != null ? invoice.getReviewedBy().getUsername() : null;

        List<SupplierInvoiceItemDTO> itemList = invoice.getItems() != null
                ? invoice.getItems().stream().map(SupplierInvoiceItemDTO::from).toList()
                : Collections.emptyList();

        return new SupplierInvoiceDTO(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                sId,
                sName,
                invoice.getSupplierNameRaw(),
                invoice.getSupplierSiren(),
                invoice.getSupplierSiret(),
                invoice.getSupplierVatNumber(),
                invoice.getCustomerName(),
                invoice.getCustomerSiren(),
                invoice.getInvoiceDate(),
                invoice.getDueDate(),
                invoice.getDeliveryDate(),
                invoice.getOrderReference(),
                invoice.getDeliveryNoteReference(),
                invoice.getTotalHt(),
                invoice.getTotalVat(),
                invoice.getTotalTtc(),
                invoice.getCurrency(),
                invoice.getStatus(),
                invoice.getFormat(),
                invoice.getProfile(),
                invoice.getFileName(),
                invoice.getFileChecksum(),
                invoice.getLegalComplianceStatus(),
                invoice.getComplianceDetails(),
                invoice.getReconciliationNotes(),
                poId,
                poRef,
                delivId,
                revById,
                revByUsername,
                invoice.getReviewedAt(),
                invoice.getCreatedAt(),
                invoice.getUpdatedAt(),
                itemList
        );
    }
}
