package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
/**
 * JPA entity representing an inventory ingredient, bottle, or raw consumable with stock thresholds.
 */

@Data
@Entity
@Table(name = "ingredients")
public class Ingredient {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Ingredient name is required")
    @Size(max = 255, message = "Name cannot exceed 255 characters")
    @Column(nullable = false)
    private String nom;

    @NotBlank(message = "Unit of measure is required")
    @Size(max = 50, message = "Unit of measure cannot exceed 50 characters")
    @Column(nullable = false)
    private String uniteMesure;

    @NotNull(message = "Stock quantity is required")
    @DecimalMin(value = "0.0", message = "Stock quantity cannot be negative")
    @Column(nullable = false)
    private BigDecimal quantiteStock;

    @NotNull(message = "Alert threshold is required")
    @DecimalMin(value = "0.0", message = "Alert threshold cannot be negative")
    @Column(nullable = false)
    private BigDecimal seuilAlerte;

    private String numeroLot;
    private LocalDateTime datePeremption;
    private BigDecimal prixUnitaire;
    private String fournisseur;
    private String notes;

    @Column(name = "degre_alcool", precision = 5, scale = 2)
    private BigDecimal degreAlcool = BigDecimal.ZERO;

    @Column(name = "is_vegan")
    private Boolean isVegan = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "ingredient_allergens", joinColumns = @JoinColumn(name = "ingredient_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "allergen", length = 50)
    private java.util.Set<Allergen> allergens = new java.util.HashSet<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Gets the alcohol degree percentage (ABV) of this ingredient.
     *
     * @return alcohol level percentage
     */
    public BigDecimal getDegreAlcool() {
        return degreAlcool != null ? degreAlcool : BigDecimal.ZERO;
    }

    /**
     * Sets the alcohol degree percentage (ABV) of this ingredient.
     *
     * @param degreAlcool alcohol level percentage to set
     */
    public void setDegreAlcool(BigDecimal degreAlcool) {
        this.degreAlcool = degreAlcool != null ? degreAlcool : BigDecimal.ZERO;
    }

    /**
     * Gets whether this ingredient is vegan-friendly.
     *
     * @return true if vegan, false otherwise
     */
    public Boolean getIsVegan() {
        return isVegan == null || isVegan;
    }

    /**
     * Sets whether this ingredient is vegan-friendly.
     *
     * @param isVegan vegan status to assign
     */
    public void setIsVegan(Boolean isVegan) {
        this.isVegan = isVegan;
    }

    /**
     * Gets the set of allergens associated with this ingredient.
     *
     * @return set of allergens
     */
    public java.util.Set<Allergen> getAllergens() {
        return allergens;
    }

    /**
     * Sets the allergens associated with this ingredient.
     *
     * @param allergens set of allergens to assign
     */
    public void setAllergens(java.util.Set<Allergen> allergens) {
        this.allergens = allergens != null ? allergens : new java.util.HashSet<>();
    }

    /**
     * Gets the unit purchase cost of this ingredient (alias for prixUnitaire).
     *
     * @return the unit cost as a {@link BigDecimal}
     */
    public BigDecimal getUnitCost() {
        return prixUnitaire;
    }

    /**
     * Sets the unit purchase cost of this ingredient (alias for prixUnitaire).
     *
     * @param unitCost the unit cost to set
     */
    public void setUnitCost(BigDecimal unitCost) {
        this.prixUnitaire = unitCost;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(java.time.ZoneId.systemDefault());
    }
} 