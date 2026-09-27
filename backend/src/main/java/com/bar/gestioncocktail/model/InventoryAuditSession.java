package com.bar.gestioncocktail.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity representing a periodic physical inventory audit session (Stocktake).
 */
@Entity
@Table(name = "inventory_audit_sessions")
public class InventoryAuditSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Reference code is required")
    @Size(max = 50, message = "Reference code cannot exceed 50 characters")
    @Column(name = "reference_code", nullable = false, unique = true, length = 50)
    private String referenceCode;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title cannot exceed 255 characters")
    @Column(nullable = false)
    private String title;

    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InventoryAuditStatus status = InventoryAuditStatus.DRAFT;

    @Column(name = "storage_location_scope", length = 100)
    private String storageLocationScope = "ALL";

    @Column(name = "category_scope", length = 50)
    private String categoryScope;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "finalized_by_id")
    private User finalizedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "total_theoretical_value_ht", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalTheoreticalValueHt = BigDecimal.ZERO;

    @Column(name = "total_counted_value_ht", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalCountedValueHt = BigDecimal.ZERO;

    @Column(name = "total_variance_value_ht", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalVarianceValueHt = BigDecimal.ZERO;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<InventoryAuditItem> items = new ArrayList<>();

    /**
     * Default constructor for JPA entity instantiation.
     */
    public InventoryAuditSession() {
        // Default constructor required by JPA
    }

    /**
     * Lifecycle callback ensuring non-null creation timestamp and status.
     */
    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now(ZoneId.systemDefault());
        }
        if (this.status == null) {
            this.status = InventoryAuditStatus.DRAFT;
        }
    }

    /**
     * Recalculates consolidated theoretical, counted, and variance values across all line items.
     */
    public void recalculateTotals() {
        BigDecimal theoreticalTotal = BigDecimal.ZERO;
        BigDecimal countedTotal = BigDecimal.ZERO;
        BigDecimal varianceTotal = BigDecimal.ZERO;

        if (items != null) {
            for (InventoryAuditItem item : items) {
                if (item.getTheoreticalValueHt() != null) {
                    theoreticalTotal = theoreticalTotal.add(item.getTheoreticalValueHt());
                }
                if (item.getCountedValueHt() != null) {
                    countedTotal = countedTotal.add(item.getCountedValueHt());
                }
                if (item.getVarianceValueHt() != null) {
                    varianceTotal = varianceTotal.add(item.getVarianceValueHt());
                }
            }
        }

        this.totalTheoreticalValueHt = theoreticalTotal.setScale(2, RoundingMode.HALF_UP);
        this.totalCountedValueHt = countedTotal.setScale(2, RoundingMode.HALF_UP);
        this.totalVarianceValueHt = varianceTotal.setScale(2, RoundingMode.HALF_UP);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReferenceCode() {
        return referenceCode;
    }

    public void setReferenceCode(String referenceCode) {
        this.referenceCode = referenceCode;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public InventoryAuditStatus getStatus() {
        return status;
    }

    public void setStatus(InventoryAuditStatus status) {
        this.status = status;
    }

    public String getStorageLocationScope() {
        return storageLocationScope;
    }

    public void setStorageLocationScope(String storageLocationScope) {
        this.storageLocationScope = storageLocationScope;
    }

    public String getCategoryScope() {
        return categoryScope;
    }

    public void setCategoryScope(String categoryScope) {
        this.categoryScope = categoryScope;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public User getFinalizedBy() {
        return finalizedBy;
    }

    public void setFinalizedBy(User finalizedBy) {
        this.finalizedBy = finalizedBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getFinalizedAt() {
        return finalizedAt;
    }

    public void setFinalizedAt(LocalDateTime finalizedAt) {
        this.finalizedAt = finalizedAt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public BigDecimal getTotalTheoreticalValueHt() {
        return totalTheoreticalValueHt;
    }

    public void setTotalTheoreticalValueHt(BigDecimal totalTheoreticalValueHt) {
        this.totalTheoreticalValueHt = totalTheoreticalValueHt;
    }

    public BigDecimal getTotalCountedValueHt() {
        return totalCountedValueHt;
    }

    public void setTotalCountedValueHt(BigDecimal totalCountedValueHt) {
        this.totalCountedValueHt = totalCountedValueHt;
    }

    public BigDecimal getTotalVarianceValueHt() {
        return totalVarianceValueHt;
    }

    public void setTotalVarianceValueHt(BigDecimal totalVarianceValueHt) {
        this.totalVarianceValueHt = totalVarianceValueHt;
    }

    public List<InventoryAuditItem> getItems() {
        return items;
    }

    public void setItems(List<InventoryAuditItem> items) {
        this.items = items;
    }
}
