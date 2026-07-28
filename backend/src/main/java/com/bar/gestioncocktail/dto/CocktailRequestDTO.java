package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Request DTO for creating or updating a cocktail.
 *
 * @param nom         Cocktail name
 * @param description Optional description
 * @param prix        Unit price (must be positive)
 * @param categorie   Cocktail category
 * @param disponible  Whether the cocktail is currently available
 * @param saisonnier  Whether the cocktail is seasonal
 * @param dateDebutSaison Start date of availability season
 * @param dateFinSaison   End date of availability season
 * @param moisDebut   Starting month (1-12) of seasonal availability
 * @param moisFin     Ending month (1-12) of seasonal availability
 */
public record CocktailRequestDTO(
    @NotBlank(message = "Le nom du cocktail est obligatoire")
    @Size(max = 255, message = "Le nom ne peut pas dépasser 255 caractères")
    String nom,

    @Size(max = 1000, message = "La description ne peut pas dépasser 1000 caractères")
    String description,

    @NotNull(message = "Le prix est obligatoire")
    @DecimalMin(value = "0.0", inclusive = false, message = "Le prix doit être supérieur à 0")
    BigDecimal prix,

    @NotNull(message = "La catégorie est obligatoire")
    CocktailCategorie categorie,

    boolean disponible,
    boolean saisonnier,
    LocalDateTime dateDebutSaison,
    LocalDateTime dateFinSaison,
    Integer moisDebut,
    Integer moisFin
) {
    /**
     * Converts this DTO into a {@link Cocktail} JPA entity.
     *
     * @return A new {@link Cocktail} entity instance
     */
    public Cocktail toEntity() {
        Cocktail cocktail = new Cocktail();
        cocktail.setNom(nom);
        cocktail.setDescription(description);
        cocktail.setPrix(prix);
        cocktail.setCategorie(categorie);
        cocktail.setDisponible(disponible);
        cocktail.setSaisonnier(saisonnier);
        cocktail.setDateDebutSaison(dateDebutSaison);
        cocktail.setDateFinSaison(dateFinSaison);
        cocktail.setMoisDebut(moisDebut);
        cocktail.setMoisFin(moisFin);
        return cocktail;
    }
}
