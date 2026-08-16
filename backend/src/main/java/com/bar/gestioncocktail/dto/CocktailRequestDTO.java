package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
 * @param instructions Preparation instructions text
 * @param imageUrl    Image URL
 * @param recipeSteps Ordered list of recipe step blocks
 */
public record CocktailRequestDTO(
    @NotBlank(message = "Cocktail name is required")
    @Size(max = 255, message = "Name cannot exceed 255 characters")
    String nom,

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    String description,

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    BigDecimal prix,

    @NotNull(message = "Category is required")
    CocktailCategorie categorie,

    boolean disponible,
    boolean saisonnier,
    LocalDateTime dateDebutSaison,
    LocalDateTime dateFinSaison,
    Integer moisDebut,
    Integer moisFin,
    String instructions,
    String imageUrl,
    List<CocktailRecipeStepRequestDTO> recipeSteps
) {
    /**
     * Backward-compatible 10-parameter constructor.
     */
    public CocktailRequestDTO(
        String nom,
        String description,
        BigDecimal prix,
        CocktailCategorie categorie,
        boolean disponible,
        boolean saisonnier,
        LocalDateTime dateDebutSaison,
        LocalDateTime dateFinSaison,
        Integer moisDebut,
        Integer moisFin
    ) {
        this(nom, description, prix, categorie, disponible, saisonnier, dateDebutSaison, dateFinSaison, moisDebut, moisFin, null, null, null);
    }

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
        cocktail.setInstructions(instructions);
        cocktail.setImageUrl(imageUrl);
        return cocktail;
    }
}
