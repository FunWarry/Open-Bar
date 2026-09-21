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
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * JPA entity representing an individual ingredient line item within a purchase order.
 */
@Entity
@Table(name = "purchase_order_items")
public class PurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Purchase order is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    @JsonIgnore
    private PurchaseOrder purchaseOrder;

    @NotNull(message = "Ingredient is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @NotNull(message = "Ordered quantity is required")
    @DecimalMin(value = "0.001", message = "Ordered quantity must be positive")
    @Column(name = "quantite_commandee", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantiteCommandee;

    @NotNull(message = "Received quantity is required")
    @DecimalMin(value = "0.0", message = "Received quantity cannot be negative")
    @Column(name = "quantite_recue", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantiteRecue = BigDecimal.ZERO;

    @NotNull(message = "Unit price HT is required")
    @DecimalMin(value = "0.0", message = "Unit price cannot be negative")
    @Column(name = "prix_unitaire_ht", nullable = false, precision = 10, scale = 2)
    private BigDecimal prixUnitaireHt;

    public static final String DEFAULT_VAT_RATE_STRING = "20.00";
    public static final BigDecimal DEFAULT_VAT_RATE = new BigDecimal(DEFAULT_VAT_RATE_STRING);

    @NotNull(message = "VAT rate is required")
    @Column(name = "taux_tva", nullable = false, precision = 5, scale = 2)
    private BigDecimal tauxTva = DEFAULT_VAT_RATE;

    /**
     * Default constructor required by JPA.
     */
    public PurchaseOrderItem() {
        // Default constructor for JPA entity instantiation
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PurchaseOrder getPurchaseOrder() {
        return purchaseOrder;
    }

    public void setPurchaseOrder(PurchaseOrder purchaseOrder) {
        this.purchaseOrder = purchaseOrder;
    }

    public Ingredient getIngredient() {
        return ingredient;
    }

    public void setIngredient(Ingredient ingredient) {
        this.ingredient = ingredient;
    }

    public BigDecimal getQuantiteCommandee() {
        return quantiteCommandee;
    }

    public void setQuantiteCommandee(BigDecimal quantiteCommandee) {
        this.quantiteCommandee = quantiteCommandee;
    }

    public BigDecimal getQuantiteRecue() {
        return quantiteRecue != null ? quantiteRecue : BigDecimal.ZERO;
    }

    public void setQuantiteRecue(BigDecimal quantiteRecue) {
        this.quantiteRecue = quantiteRecue != null ? quantiteRecue : BigDecimal.ZERO;
    }

    public BigDecimal getPrixUnitaireHt() {
        return prixUnitaireHt;
    }

    public void setPrixUnitaireHt(BigDecimal prixUnitaireHt) {
        this.prixUnitaireHt = prixUnitaireHt;
    }

    public BigDecimal getTauxTva() {
        return tauxTva != null ? tauxTva : DEFAULT_VAT_RATE;
    }

    public void setTauxTva(BigDecimal tauxTva) {
        this.tauxTva = tauxTva != null ? tauxTva : DEFAULT_VAT_RATE;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PurchaseOrderItem that = (PurchaseOrderItem) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
