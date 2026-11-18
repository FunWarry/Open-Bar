package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * JPA entity representing an individual invoiced product line on a supplier invoice.
 * Captures billed quantities, unit costs, VAT rates, and links to catalog ingredients / purchase order items.
 */
@Entity
@Table(name = "supplier_invoice_items")
public class SupplierInvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private SupplierInvoice invoice;

    @NotNull
    @Column(name = "line_number", nullable = false)
    private Integer lineNumber = 1;

    @Size(max = 100, message = "Product reference cannot exceed 100 characters")
    @Column(name = "product_reference", length = 100)
    private String productReference;

    @NotBlank(message = "Designation cannot be blank")
    @Size(max = 255, message = "Designation cannot exceed 255 characters")
    @Column(name = "designation", nullable = false)
    private String designation;

    @Size(max = 100, message = "Packaging cannot exceed 100 characters")
    @Column(name = "packaging", length = 100)
    private String packaging;

    @NotNull
    @Column(name = "quantity_invoiced", nullable = false, precision = 10, scale = 3)
    private BigDecimal quantityInvoiced = BigDecimal.ZERO;

    @NotNull
    @Column(name = "unit_price_ht", nullable = false, precision = 10, scale = 4)
    private BigDecimal unitPriceHt = BigDecimal.ZERO;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @NotNull
    @Column(name = "vat_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal vatRate = new BigDecimal("20.00");

    @NotNull
    @Column(name = "line_total_ht", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotalHt = BigDecimal.ZERO;

    @NotNull
    @Column(name = "line_total_ttc", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotalTtc = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_ingredient_id")
    private Ingredient matchedIngredient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_po_item_id")
    private PurchaseOrderItem matchedPurchaseOrderItem;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "reconciliation_status", nullable = false, length = 50)
    private InvoiceItemReconciliationStatus reconciliationStatus = InvoiceItemReconciliationStatus.MATCHED;

    @Column(name = "variance_details", columnDefinition = "TEXT")
    private String varianceDetails;

    @Column(name = "suggested_packaging_capacity", precision = 10, scale = 3)
    private BigDecimal suggestedPackagingCapacity = BigDecimal.ONE;

    @Column(name = "effective_received_quantity", precision = 10, scale = 3)
    private BigDecimal effectiveReceivedQuantity;

    @Column(name = "effective_unit_price_ht", precision = 10, scale = 4)
    private BigDecimal effectiveUnitPriceHt;

    /**
     * Default constructor for JPA.
     */
    public SupplierInvoiceItem() {
        // JPA specification
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public SupplierInvoice getInvoice() {
        return invoice;
    }

    public void setInvoice(SupplierInvoice invoice) {
        this.invoice = invoice;
    }

    public Integer getLineNumber() {
        return lineNumber;
    }

    public void setLineNumber(Integer lineNumber) {
        this.lineNumber = lineNumber;
    }

    public String getProductReference() {
        return productReference;
    }

    public void setProductReference(String productReference) {
        this.productReference = productReference;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public String getPackaging() {
        return packaging;
    }

    public void setPackaging(String packaging) {
        this.packaging = packaging;
    }

    public BigDecimal getQuantityInvoiced() {
        return quantityInvoiced;
    }

    public void setQuantityInvoiced(BigDecimal quantityInvoiced) {
        this.quantityInvoiced = quantityInvoiced;
    }

    public BigDecimal getUnitPriceHt() {
        return unitPriceHt;
    }

    public void setUnitPriceHt(BigDecimal unitPriceHt) {
        this.unitPriceHt = unitPriceHt;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public BigDecimal getVatRate() {
        return vatRate;
    }

    public void setVatRate(BigDecimal vatRate) {
        this.vatRate = vatRate;
    }

    public BigDecimal getLineTotalHt() {
        return lineTotalHt;
    }

    public void setLineTotalHt(BigDecimal lineTotalHt) {
        this.lineTotalHt = lineTotalHt;
    }

    public BigDecimal getLineTotalTtc() {
        return lineTotalTtc;
    }

    public void setLineTotalTtc(BigDecimal lineTotalTtc) {
        this.lineTotalTtc = lineTotalTtc;
    }

    public Ingredient getMatchedIngredient() {
        return matchedIngredient;
    }

    public void setMatchedIngredient(Ingredient matchedIngredient) {
        this.matchedIngredient = matchedIngredient;
    }

    public PurchaseOrderItem getMatchedPurchaseOrderItem() {
        return matchedPurchaseOrderItem;
    }

    public void setMatchedPurchaseOrderItem(PurchaseOrderItem matchedPurchaseOrderItem) {
        this.matchedPurchaseOrderItem = matchedPurchaseOrderItem;
    }

    public InvoiceItemReconciliationStatus getReconciliationStatus() {
        return reconciliationStatus;
    }

    public void setReconciliationStatus(InvoiceItemReconciliationStatus reconciliationStatus) {
        this.reconciliationStatus = reconciliationStatus;
    }

    public String getVarianceDetails() {
        return varianceDetails;
    }

    public void setVarianceDetails(String varianceDetails) {
        this.varianceDetails = varianceDetails;
    }

    public BigDecimal getSuggestedPackagingCapacity() {
        return suggestedPackagingCapacity;
    }

    public void setSuggestedPackagingCapacity(BigDecimal suggestedPackagingCapacity) {
        this.suggestedPackagingCapacity = suggestedPackagingCapacity;
    }

    public BigDecimal getEffectiveReceivedQuantity() {
        return effectiveReceivedQuantity != null ? effectiveReceivedQuantity : quantityInvoiced;
    }

    public void setEffectiveReceivedQuantity(BigDecimal effectiveReceivedQuantity) {
        this.effectiveReceivedQuantity = effectiveReceivedQuantity;
    }

    public BigDecimal getEffectiveUnitPriceHt() {
        return effectiveUnitPriceHt != null ? effectiveUnitPriceHt : unitPriceHt;
    }

    public void setEffectiveUnitPriceHt(BigDecimal effectiveUnitPriceHt) {
        this.effectiveUnitPriceHt = effectiveUnitPriceHt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SupplierInvoiceItem item = (SupplierInvoiceItem) o;
        return Objects.equals(id, item.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
