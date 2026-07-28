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
    @NotBlank(message = "Le nom de l'ingrédient est obligatoire")
    @Size(max = 255, message = "Le nom ne peut pas dépasser 255 caractères")
    String nom,

    @NotBlank(message = "L'unité de mesure est obligatoire")
    @Size(max = 50, message = "L'unité de mesure ne peut pas dépasser 50 caractères")
    String uniteMesure,

    @NotNull(message = "La quantité en stock est obligatoire")
    @DecimalMin(value = "0.0", message = "La quantité en stock ne peut pas être négative")
    BigDecimal quantiteStock,

    @NotNull(message = "Le seuil d'alerte est obligatoire")
    @DecimalMin(value = "0.0", message = "Le seuil d'alerte ne peut pas être négatif")
    BigDecimal seuilAlerte,

    String numeroLot,
    LocalDateTime datePeremption,
    BigDecimal prixUnitaire,
    String fournisseur,
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
