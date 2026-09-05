package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Ingredient;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
 * @param fournisseur    Optional supplier name
 * @param notes          Optional notes
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

    @Size(max = 100, message = "Supplier name cannot exceed 100 characters")
    String fournisseur,

    @Size(max = 2000, message = "Notes cannot exceed 2000 characters")
    String notes
) {
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
        ingredient.setPrixUnitaire(prixUnitaire);
        ingredient.setFournisseur(fournisseur);
        ingredient.setNotes(notes);
        return ingredient;
    }
}
