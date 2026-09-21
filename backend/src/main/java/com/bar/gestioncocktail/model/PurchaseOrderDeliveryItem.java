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
 * JPA entity recording each received ingredient line item within a goods delivery intake,
 * preserving before-and-after Weighted Average Unit Cost (PAMP) values for auditability.
 */
@Entity
@Table(name = "purchase_order_delivery_items")
public class PurchaseOrderDeliveryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Delivery is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_id", nullable = false)
    @JsonIgnore
    private PurchaseOrderDelivery delivery;

    @NotNull(message = "Ingredient is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @NotNull(message = "Received quantity is required")
    @DecimalMin(value = "0.001", message = "Received quantity must be positive")
    @Column(name = "quantite_recue", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantiteRecue;

    @NotNull(message = "Unit price HT is required")
    @DecimalMin(value = "0.0", message = "Unit price cannot be negative")
    @Column(name = "prix_unitaire_ht", nullable = false, precision = 10, scale = 2)
    private BigDecimal prixUnitaireHt;

    @Column(name = "ancien_pamp", precision = 10, scale = 2)
    private BigDecimal ancienPamp;

    @NotNull(message = "New PAMP is required")
    @Column(name = "nouveau_pamp", nullable = false, precision = 10, scale = 2)
    private BigDecimal nouveauPamp;

    /**
     * Default constructor required by JPA.
     */
    public PurchaseOrderDeliveryItem() {
        // Default constructor for JPA entity instantiation
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PurchaseOrderDelivery getDelivery() {
        return delivery;
    }

    public void setDelivery(PurchaseOrderDelivery delivery) {
        this.delivery = delivery;
    }

    public Ingredient getIngredient() {
        return ingredient;
    }

    public void setIngredient(Ingredient ingredient) {
        this.ingredient = ingredient;
    }

    public BigDecimal getQuantiteRecue() {
        return quantiteRecue;
    }

    public void setQuantiteRecue(BigDecimal quantiteRecue) {
        this.quantiteRecue = quantiteRecue;
    }

    public BigDecimal getPrixUnitaireHt() {
        return prixUnitaireHt;
    }

    public void setPrixUnitaireHt(BigDecimal prixUnitaireHt) {
        this.prixUnitaireHt = prixUnitaireHt;
    }

    public BigDecimal getAncienPamp() {
        return ancienPamp;
    }

    public void setAncienPamp(BigDecimal ancienPamp) {
        this.ancienPamp = ancienPamp;
    }

    public BigDecimal getNouveauPamp() {
        return nouveauPamp;
    }

    public void setNouveauPamp(BigDecimal nouveauPamp) {
        this.nouveauPamp = nouveauPamp;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PurchaseOrderDeliveryItem that = (PurchaseOrderDeliveryItem) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
