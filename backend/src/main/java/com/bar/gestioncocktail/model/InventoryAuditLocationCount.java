package com.bar.gestioncocktail.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Entity capturing a physical stock count record at a specific storage location
 * (e.g. Main Bar, Back Bar, Wine Cellar, Keg Room) within an audit session line item.
 */
@Entity
@Table(name = "inventory_audit_location_counts")
public class InventoryAuditLocationCount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Audit item is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audit_item_id", nullable = false)
    @JsonIgnore
    private InventoryAuditItem auditItem;

    @NotBlank(message = "Storage location is required")
    @Size(max = 100, message = "Storage location cannot exceed 100 characters")
    @Column(name = "storage_location", nullable = false, length = 100)
    private String storageLocation = "Main Bar";

    @NotNull(message = "Full containers count cannot be null")
    @Column(name = "full_containers_count", nullable = false)
    private Integer fullContainersCount = 0;

    @NotNull(message = "Partial quantity cannot be null")
    @DecimalMin(value = "0.0", message = "Partial quantity cannot be negative")
    @Column(name = "partial_quantity", nullable = false, precision = 10, scale = 3)
    private BigDecimal partialQuantity = BigDecimal.ZERO;

    @NotNull(message = "Counted quantity cannot be null")
    @DecimalMin(value = "0.0", message = "Counted quantity cannot be negative")
    @Column(name = "counted_quantity", nullable = false, precision = 10, scale = 3)
    private BigDecimal countedQuantity = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "counted_at", nullable = false)
    private LocalDateTime countedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "counted_by_id")
    private User countedBy;

    /**
     * Default constructor for JPA entity instantiation.
     */
    public InventoryAuditLocationCount() {
        // Default constructor required by JPA
    }

    /**
     * Pre-persist callback to guarantee timestamp initialization.
     */
    @PrePersist
    protected void onCreate() {
        if (this.countedAt == null) {
            this.countedAt = LocalDateTime.now(ZoneId.systemDefault());
        }
        if (this.partialQuantity == null) {
            this.partialQuantity = BigDecimal.ZERO;
        }
        if (this.fullContainersCount == null) {
            this.fullContainersCount = 0;
        }
        if (this.countedQuantity == null) {
            this.countedQuantity = BigDecimal.ZERO;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public InventoryAuditItem getAuditItem() {
        return auditItem;
    }

    public void setAuditItem(InventoryAuditItem auditItem) {
        this.auditItem = auditItem;
    }

    public String getStorageLocation() {
        return storageLocation;
    }

    public void setStorageLocation(String storageLocation) {
        this.storageLocation = storageLocation;
    }

    public Integer getFullContainersCount() {
        return fullContainersCount;
    }

    public void setFullContainersCount(Integer fullContainersCount) {
        this.fullContainersCount = fullContainersCount;
    }

    public BigDecimal getPartialQuantity() {
        return partialQuantity;
    }

    public void setPartialQuantity(BigDecimal partialQuantity) {
        this.partialQuantity = partialQuantity;
    }

    public BigDecimal getCountedQuantity() {
        return countedQuantity;
    }

    public void setCountedQuantity(BigDecimal countedQuantity) {
        this.countedQuantity = countedQuantity;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getCountedAt() {
        return countedAt;
    }

    public void setCountedAt(LocalDateTime countedAt) {
        this.countedAt = countedAt;
    }

    public User getCountedBy() {
        return countedBy;
    }

    public void setCountedBy(User countedBy) {
        this.countedBy = countedBy;
    }
}
