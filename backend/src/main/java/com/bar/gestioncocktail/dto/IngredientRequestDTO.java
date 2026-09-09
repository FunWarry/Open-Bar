package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Allergen;
import com.bar.gestioncocktail.model.Ingredient;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Request DTO for creating or updating an ingredient.
 *
 * @param nom            Ingredient name
 * @param uniteMesure    Unit of measurement (e.g., cl, g)
 * @param quantiteStock  Current stock quantity
 * @param seuilAlerte    Alert threshold for low stock
 * @param numeroLot      Optional lot number
 * @param datePeremption Optional expiry date
 * @param prixUnitaire   Optional unit price
 * @param unitCost       Optional unit cost alias
 * @param fournisseur    Optional supplier name
 * @param notes          Optional notes
 * @param allergens      Optional set of allergens contained in the ingredient
 */
public record IngredientRequestDTO(
    @NotBlank(message = "Ingredient name is required")
    @Size(max = 100, message = "Name cannot exceed 100 characters")
    String nom,

    @NotBlank(message = "Unit of measurement is required")
    @Size(max = 20, message = "Unit of measurement cannot exceed 20 characters")
    String uniteMesure,

    @NotNull(message = "Stock quantity is required")
    @DecimalMin(value = "0.0", message = "Stock quantity cannot be negative")
    BigDecimal quantiteStock,

    @NotNull(message = "Alert threshold is required")
    @DecimalMin(value = "0.0", message = "Alert threshold cannot be negative")
    BigDecimal seuilAlerte,

    @Size(max = 100, message = "Lot number cannot exceed 100 characters")
    String numeroLot,

    LocalDateTime datePeremption,

    @DecimalMin(value = "0.0", message = "Unit price cannot be negative")
    BigDecimal prixUnitaire,

    @DecimalMin(value = "0.0", message = "Unit cost cannot be negative")
    BigDecimal unitCost,

    @Size(max = 100, message = "Supplier name cannot exceed 100 characters")
    String fournisseur,

    @Size(max = 2000, message = "Notes cannot exceed 2000 characters")
    String notes,

    Set<Allergen> allergens,

    @DecimalMin(value = "0.0", message = "Alcohol degree cannot be negative")
    BigDecimal degreAlcool,

    Boolean isVegan
) {
    /**
     * Backward-compatible constructor without degreAlcool and isVegan.
     */
    public IngredientRequestDTO(
        String nom,
        String uniteMesure,
        BigDecimal quantiteStock,
        BigDecimal seuilAlerte,
        String numeroLot,
        LocalDateTime datePeremption,
        BigDecimal prixUnitaire,
        BigDecimal unitCost,
        String fournisseur,
        String notes,
        Set<Allergen> allergens
    ) {
        this(nom, uniteMesure, quantiteStock, seuilAlerte, numeroLot, datePeremption, prixUnitaire, unitCost, fournisseur, notes, allergens, BigDecimal.ZERO, true);
    }

    /**
     * Backward-compatible constructor without allergens, degreAlcool and isVegan.
     */
    public IngredientRequestDTO(
        String nom,
        String uniteMesure,
        BigDecimal quantiteStock,
        BigDecimal seuilAlerte,
        String numeroLot,
        LocalDateTime datePeremption,
        BigDecimal prixUnitaire,
        BigDecimal unitCost,
        String fournisseur,
        String notes
    ) {
        this(nom, uniteMesure, quantiteStock, seuilAlerte, numeroLot, datePeremption, prixUnitaire, unitCost, fournisseur, notes, Set.of(), BigDecimal.ZERO, true);
    }

    /**
     * Backward-compatible constructor without unitCost alias, allergens, degreAlcool and isVegan.
     */
    public IngredientRequestDTO(
        String nom,
        String uniteMesure,
        BigDecimal quantiteStock,
        BigDecimal seuilAlerte,
        String numeroLot,
        LocalDateTime datePeremption,
        BigDecimal prixUnitaire,
        String fournisseur,
        String notes
    ) {
        this(nom, uniteMesure, quantiteStock, seuilAlerte, numeroLot, datePeremption, prixUnitaire, null, fournisseur, notes, Set.of(), BigDecimal.ZERO, true);
    }

    /**
     * Converts this DTO into an {@link Ingredient} JPA entity.
     *
     * @return A new {@link Ingredient} entity instance
     */
    public Ingredient toEntity() {
        Ingredient ingredient = new Ingredient();
        ingredient.setNom(nom);
        ingredient.setUniteMesure(uniteMesure);
        ingredient.setQuantiteStock(quantiteStock);
        ingredient.setSeuilAlerte(seuilAlerte);
        ingredient.setNumeroLot(numeroLot);
        ingredient.setDatePeremption(datePeremption);
        BigDecimal effectiveCost = prixUnitaire != null ? prixUnitaire : unitCost;
        ingredient.setPrixUnitaire(effectiveCost);
        ingredient.setFournisseur(fournisseur);
        ingredient.setNotes(notes);
        ingredient.setAllergens(allergens != null ? allergens : new HashSet<>());
        ingredient.setDegreAlcool(degreAlcool != null ? degreAlcool : BigDecimal.ZERO);
        ingredient.setIsVegan(isVegan == null || isVegan);
        return ingredient;
    }
}
