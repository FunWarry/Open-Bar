package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.SupplierInvoice;
import com.bar.gestioncocktail.model.SupplierInvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link SupplierInvoice} entities.
 */
@Repository
public interface SupplierInvoiceRepository extends JpaRepository<SupplierInvoice, Long> {

    /**
     * Finds an invoice by its SHA-256 file checksum to detect duplicates.
     *
     * @param checksum SHA-256 hash of invoice file
     * @return optional invoice
     */
    Optional<SupplierInvoice> findByFileChecksum(String checksum);

    /**
     * Finds an invoice by supplier ID and invoice number.
     *
     * @param supplierId    supplier identifier
     * @param invoiceNumber supplier invoice number
     * @return optional invoice
     */
    Optional<SupplierInvoice> findBySupplierIdAndInvoiceNumber(Long supplierId, String invoiceNumber);

    /**
     * Finds all invoices for a given supplier ordered by invoice date descending.
     *
     * @param supplierId supplier identifier
     * @return list of supplier invoices
     */
    List<SupplierInvoice> findBySupplierIdOrderByInvoiceDateDesc(Long supplierId);

    /**
     * Finds all invoices with a specific lifecycle status.
     *
     * @param status lifecycle status filter
     * @return list of invoices
     */
    List<SupplierInvoice> findByStatusOrderByInvoiceDateDesc(SupplierInvoiceStatus status);

    /**
     * Retrieves all supplier invoices ordered by creation date descending.
     *
     * @return all invoices ordered chronologically
     */
    List<SupplierInvoice> findAllByOrderByCreatedAtDesc();

    /**
     * Finds invoices associated with a specific purchase order.
     *
     * @param purchaseOrderId purchase order identifier
     * @return list of matching invoices
     */
    List<SupplierInvoice> findByPurchaseOrderId(Long purchaseOrderId);
}
