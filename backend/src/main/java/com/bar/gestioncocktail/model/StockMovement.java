package com.bar.gestioncocktail.model;

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
 * Entity representing an inventory loss, waste declaration, or stock shrinkage event.
 */
@Entity
@Table(name = "stock_movements")
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Ingredient is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.001", message = "Quantity must be positive")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity;

    @NotBlank(message = "Unit is required")
    @Size(max = 50, message = "Unit cannot exceed 50 characters")
    @Column(nullable = false, length = 50)
    private String unit;

    @NotNull(message = "Waste reason is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private StockWasteReason reason;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reported_by_id")
    private User reportedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(precision = 10, scale = 2)
    private BigDecimal cost;

    @Column(nullable = false)
    private LocalDateTime recordedAt;

    /**
     * Default constructor for JPA.
     */
    public StockMovement() {
        // Default constructor for JPA entity instantiation
    }

    /**
     * Initializes default timestamps before saving to database.
     */
    @PrePersist
    protected void onCreate() {
        if (this.recordedAt == null) {
            this.recordedAt = LocalDateTime.now(ZoneId.systemDefault());
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Ingredient getIngredient() {
        return ingredient;
    }

    public void setIngredient(Ingredient ingredient) {
        this.ingredient = ingredient;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public StockWasteReason getReason() {
        return reason;
    }

    public void setReason(StockWasteReason reason) {
        this.reason = reason;
    }

    public User getReportedBy() {
        return reportedBy;
    }

    public void setReportedBy(User reportedBy) {
        this.reportedBy = reportedBy;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public BigDecimal getCost() {
        return cost;
    }

    public void setCost(BigDecimal cost) {
        this.cost = cost;
    }

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(LocalDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }
}
