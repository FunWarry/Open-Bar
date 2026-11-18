package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * JPA entity representing a digital supplier invoice imported via Factur-X XML or standard PDF.
 * Enables automated reconciliation against Purchase Orders, price variance detection, and stock intake.
 */
@Entity
@Table(name = "supplier_invoices")
public class SupplierInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Invoice number cannot be blank")
    @Size(max = 100, message = "Invoice number cannot exceed 100 characters")
    @Column(name = "invoice_number", nullable = false)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Size(max = 255, message = "Raw supplier name cannot exceed 255 characters")
    @Column(name = "supplier_name_raw")
    private String supplierNameRaw;

    @Size(max = 20, message = "Supplier SIREN cannot exceed 20 characters")
    @Column(name = "supplier_siren", length = 20)
    private String supplierSiren;

    @Size(max = 20, message = "Supplier SIRET cannot exceed 20 characters")
    @Column(name = "supplier_siret", length = 20)
    private String supplierSiret;

    @Size(max = 30, message = "Supplier VAT number cannot exceed 30 characters")
    @Column(name = "supplier_vat_number", length = 30)
    private String supplierVatNumber;

    @Size(max = 255, message = "Customer name cannot exceed 255 characters")
    @Column(name = "customer_name")
    private String customerName;

    @Size(max = 20, message = "Customer SIREN cannot exceed 20 characters")
    @Column(name = "customer_siren", length = 20)
    private String customerSiren;

    @Column(name = "invoice_date")
    private LocalDate invoiceDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "delivery_date")
    private LocalDate deliveryDate;

    @Size(max = 100, message = "Order reference cannot exceed 100 characters")
    @Column(name = "order_reference", length = 100)
    private String orderReference;

    @Size(max = 100, message = "Delivery note reference cannot exceed 100 characters")
    @Column(name = "delivery_note_reference", length = 100)
    private String deliveryNoteReference;

    @NotNull
    @Column(name = "total_ht", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalHt = BigDecimal.ZERO;

    @NotNull
    @Column(name = "total_vat", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalVat = BigDecimal.ZERO;

    @NotNull
    @Column(name = "total_ttc", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalTtc = BigDecimal.ZERO;

    @Size(max = 10, message = "Currency cannot exceed 10 characters")
    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "EUR";

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private SupplierInvoiceStatus status = SupplierInvoiceStatus.PENDING_REVIEW;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false, length = 50)
    private SupplierInvoiceFormat format = SupplierInvoiceFormat.FACTUR_X;

    @Size(max = 50, message = "Profile cannot exceed 50 characters")
    @Column(name = "profile", length = 50)
    private String profile = "EN 16931";

    @Size(max = 255, message = "File name cannot exceed 255 characters")
    @Column(name = "file_name")
    private String fileName;

    @Size(max = 64, message = "Checksum cannot exceed 64 characters")
    @Column(name = "file_checksum", length = 64)
    private String fileChecksum;

    @Column(name = "raw_xml_content", columnDefinition = "TEXT")
    private String rawXmlContent;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "legal_compliance_status", nullable = false, length = 50)
    private SupplierInvoiceComplianceStatus legalComplianceStatus = SupplierInvoiceComplianceStatus.COMPLIANT;

    @Column(name = "compliance_details", columnDefinition = "TEXT")
    private String complianceDetails;

    @Column(name = "reconciliation_notes", columnDefinition = "TEXT")
    private String reconciliationNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id")
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_id")
    private PurchaseOrderDelivery delivery;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("lineNumber ASC")
    private List<SupplierInvoiceItem> items = new ArrayList<>();

    /**
     * Default constructor for JPA.
     */
    public SupplierInvoice() {
        // JPA specification
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(ZoneId.systemDefault());
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }

    /**
     * Adds a line item to this invoice.
     *
     * @param item item to associate
     */
    public void addItem(SupplierInvoiceItem item) {
        if (item != null) {
            this.items.add(item);
            item.setInvoice(this);
        }
    }

    /**
     * Removes a line item from this invoice.
     *
     * @param item item to remove
     */
    public void removeItem(SupplierInvoiceItem item) {
        if (item != null) {
            this.items.remove(item);
            item.setInvoice(null);
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public Supplier getSupplier() {
        return supplier;
    }

    public void setSupplier(Supplier supplier) {
        this.supplier = supplier;
    }

    public String getSupplierNameRaw() {
        return supplierNameRaw;
    }

    public void setSupplierNameRaw(String supplierNameRaw) {
        this.supplierNameRaw = supplierNameRaw;
    }

    public String getSupplierSiren() {
        return supplierSiren;
    }

    public void setSupplierSiren(String supplierSiren) {
        this.supplierSiren = supplierSiren;
    }

    public String getSupplierSiret() {
        return supplierSiret;
    }

    public void setSupplierSiret(String supplierSiret) {
        this.supplierSiret = supplierSiret;
    }

    public String getSupplierVatNumber() {
        return supplierVatNumber;
    }

    public void setSupplierVatNumber(String supplierVatNumber) {
        this.supplierVatNumber = supplierVatNumber;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerSiren() {
        return customerSiren;
    }

    public void setCustomerSiren(String customerSiren) {
        this.customerSiren = customerSiren;
    }

    public LocalDate getInvoiceDate() {
        return invoiceDate;
    }

    public void setInvoiceDate(LocalDate invoiceDate) {
        this.invoiceDate = invoiceDate;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public LocalDate getDeliveryDate() {
        return deliveryDate;
    }

    public void setDeliveryDate(LocalDate deliveryDate) {
        this.deliveryDate = deliveryDate;
    }

    public String getOrderReference() {
        return orderReference;
    }

    public void setOrderReference(String orderReference) {
        this.orderReference = orderReference;
    }

    public String getDeliveryNoteReference() {
        return deliveryNoteReference;
    }

    public void setDeliveryNoteReference(String deliveryNoteReference) {
        this.deliveryNoteReference = deliveryNoteReference;
    }

    public BigDecimal getTotalHt() {
        return totalHt;
    }

    public void setTotalHt(BigDecimal totalHt) {
        this.totalHt = totalHt;
    }

    public BigDecimal getTotalVat() {
        return totalVat;
    }

    public void setTotalVat(BigDecimal totalVat) {
        this.totalVat = totalVat;
    }

    public BigDecimal getTotalTtc() {
        return totalTtc;
    }

    public void setTotalTtc(BigDecimal totalTtc) {
        this.totalTtc = totalTtc;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public SupplierInvoiceStatus getStatus() {
        return status;
    }

    public void setStatus(SupplierInvoiceStatus status) {
        this.status = status;
    }

    public SupplierInvoiceFormat getFormat() {
        return format;
    }

    public void setFormat(SupplierInvoiceFormat format) {
        this.format = format;
    }

    public String getProfile() {
        return profile;
    }

    public void setProfile(String profile) {
        this.profile = profile;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileChecksum() {
        return fileChecksum;
    }

    public void setFileChecksum(String fileChecksum) {
        this.fileChecksum = fileChecksum;
    }

    public String getRawXmlContent() {
        return rawXmlContent;
    }

    public void setRawXmlContent(String rawXmlContent) {
        this.rawXmlContent = rawXmlContent;
    }

    public SupplierInvoiceComplianceStatus getLegalComplianceStatus() {
        return legalComplianceStatus;
    }

    public void setLegalComplianceStatus(SupplierInvoiceComplianceStatus legalComplianceStatus) {
        this.legalComplianceStatus = legalComplianceStatus;
    }

    public String getComplianceDetails() {
        return complianceDetails;
    }

    public void setComplianceDetails(String complianceDetails) {
        this.complianceDetails = complianceDetails;
    }

    public String getReconciliationNotes() {
        return reconciliationNotes;
    }

    public void setReconciliationNotes(String reconciliationNotes) {
        this.reconciliationNotes = reconciliationNotes;
    }

    public PurchaseOrder getPurchaseOrder() {
        return purchaseOrder;
    }

    public void setPurchaseOrder(PurchaseOrder purchaseOrder) {
        this.purchaseOrder = purchaseOrder;
    }

    public PurchaseOrderDelivery getDelivery() {
        return delivery;
    }

    public void setDelivery(PurchaseOrderDelivery delivery) {
        this.delivery = delivery;
    }

    public User getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(User reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<SupplierInvoiceItem> getItems() {
        return items;
    }

    public void setItems(List<SupplierInvoiceItem> items) {
        this.items = items;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SupplierInvoice invoice = (SupplierInvoice) o;
        return Objects.equals(id, invoice.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
