package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request DTO for creating or updating a cocktail variant.
 *
 * @param cocktailId                Identifier of the parent cocktail
 * @param nom                       Variant name
 * @param description               Optional description
 * @param prixSupplement            Additional price for the variant
 * @param multiplicateurIngredient  Ingredient multiplier for this variant
 * @param disponible                Whether the variant is currently available
 * @param instructions              Optional preparation instructions
 */
public record CocktailVarianteRequestDTO(
    @NotNull(message = "Le cocktail est obligatoire")
    Long cocktailId,

    String nom,
    String description,
    BigDecimal prixSupplement,

    @DecimalMin(value = "0.0", inclusive = false, message = "Le multiplicateur doit être positif")
    BigDecimal multiplicateurIngredient,

    boolean disponible,
    String instructions
) {
    /**
     * Converts this DTO into a {@link CocktailVariante} JPA entity.
     *
     * @return A new {@link CocktailVariante} entity instance
     */
    public CocktailVariante toEntity() {
        CocktailVariante variante = new CocktailVariante();
        if (cocktailId != null) {
            Cocktail cocktail = new Cocktail();
            cocktail.setId(cocktailId);
            variante.setCocktail(cocktail);
        }
        variante.setNom(nom);
        variante.setDescription(description);
        variante.setPrixSupplement(prixSupplement);
        if (multiplicateurIngredient != null) {
            variante.setMultiplicateurIngredient(multiplicateurIngredient);
        }
        variante.setDisponible(disponible);
        variante.setInstructions(instructions);
        return variante;
    }
}
