package com.bar.gestioncocktail.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Line item in an inventory audit session linking an audited ingredient to its snapshotted
 * theoretical balance, physical count entries, and computed variances.
 */
@Entity
@Table(name = "inventory_audit_items")
public class InventoryAuditItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Session is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnore
    private InventoryAuditSession session;

    @NotNull(message = "Ingredient is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @NotNull(message = "Theoretical quantity cannot be null")
    @Column(name = "theoretical_quantity", nullable = false, precision = 10, scale = 3)
    private BigDecimal theoreticalQuantity = BigDecimal.ZERO;

    @Column(name = "counted_quantity", precision = 10, scale = 3)
    private BigDecimal countedQuantity;

    @Column(name = "variance_quantity", nullable = false, precision = 10, scale = 3)
    private BigDecimal varianceQuantity = BigDecimal.ZERO;

    @Column(name = "unit_cost_ht", nullable = false, precision = 10, scale = 4)
    private BigDecimal unitCostHt = BigDecimal.ZERO;

    @Column(name = "theoretical_value_ht", nullable = false, precision = 12, scale = 2)
    private BigDecimal theoreticalValueHt = BigDecimal.ZERO;

    @Column(name = "counted_value_ht", nullable = false, precision = 12, scale = 2)
    private BigDecimal countedValueHt = BigDecimal.ZERO;

    @Column(name = "variance_value_ht", nullable = false, precision = 12, scale = 2)
    private BigDecimal varianceValueHt = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "auditItem", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<InventoryAuditLocationCount> locationCounts = new ArrayList<>();

    /**
     * Default constructor for JPA entity instantiation.
     */
    public InventoryAuditItem() {
        // Default constructor required by JPA
    }

    /**
     * Helper method to recalculate item totals from its location counts.
     */
    public void recalculateTotals() {
        if (locationCounts == null || locationCounts.isEmpty()) {
            this.countedQuantity = null;
            this.varianceQuantity = BigDecimal.ZERO;
            this.countedValueHt = BigDecimal.ZERO;
            this.varianceValueHt = BigDecimal.ZERO;
            return;
        }

        BigDecimal totalCounted = BigDecimal.ZERO;
        for (InventoryAuditLocationCount lc : locationCounts) {
            if (lc.getCountedQuantity() != null) {
                totalCounted = totalCounted.add(lc.getCountedQuantity());
            }
        }

        this.countedQuantity = totalCounted.setScale(3, RoundingMode.HALF_UP);
        BigDecimal theo = this.theoreticalQuantity != null ? this.theoreticalQuantity : BigDecimal.ZERO;
        this.varianceQuantity = this.countedQuantity.subtract(theo).setScale(3, RoundingMode.HALF_UP);

        BigDecimal cost = this.unitCostHt != null ? this.unitCostHt : BigDecimal.ZERO;
        this.theoreticalValueHt = theo.multiply(cost).setScale(2, RoundingMode.HALF_UP);
        this.countedValueHt = this.countedQuantity.multiply(cost).setScale(2, RoundingMode.HALF_UP);
        this.varianceValueHt = this.varianceQuantity.multiply(cost).setScale(2, RoundingMode.HALF_UP);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public InventoryAuditSession getSession() {
        return session;
    }

    public void setSession(InventoryAuditSession session) {
        this.session = session;
    }

    public Ingredient getIngredient() {
        return ingredient;
    }

    public void setIngredient(Ingredient ingredient) {
        this.ingredient = ingredient;
    }

    public BigDecimal getTheoreticalQuantity() {
        return theoreticalQuantity;
    }

    public void setTheoreticalQuantity(BigDecimal theoreticalQuantity) {
        this.theoreticalQuantity = theoreticalQuantity;
    }

    public BigDecimal getCountedQuantity() {
        return countedQuantity;
    }

    public void setCountedQuantity(BigDecimal countedQuantity) {
        this.countedQuantity = countedQuantity;
    }

    public BigDecimal getVarianceQuantity() {
        return varianceQuantity;
    }

    public void setVarianceQuantity(BigDecimal varianceQuantity) {
        this.varianceQuantity = varianceQuantity;
    }

    public BigDecimal getUnitCostHt() {
        return unitCostHt;
    }

    public void setUnitCostHt(BigDecimal unitCostHt) {
        this.unitCostHt = unitCostHt;
    }

    public BigDecimal getTheoreticalValueHt() {
        return theoreticalValueHt;
    }

    public void setTheoreticalValueHt(BigDecimal theoreticalValueHt) {
        this.theoreticalValueHt = theoreticalValueHt;
    }

    public BigDecimal getCountedValueHt() {
        return countedValueHt;
    }

    public void setCountedValueHt(BigDecimal countedValueHt) {
        this.countedValueHt = countedValueHt;
    }

    public BigDecimal getVarianceValueHt() {
        return varianceValueHt;
    }

    public void setVarianceValueHt(BigDecimal varianceValueHt) {
        this.varianceValueHt = varianceValueHt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public List<InventoryAuditLocationCount> getLocationCounts() {
        return locationCounts;
    }

    public void setLocationCounts(List<InventoryAuditLocationCount> locationCounts) {
        this.locationCounts = locationCounts;
    }
}
