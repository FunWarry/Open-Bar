package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request DTO for creating or updating a cocktail variant.
 *
 * @param id                        Identifier of the variant (if updating an existing variant)
 * @param cocktailId                Identifier of the parent cocktail (optional when creating within cocktail)
 * @param nom                       Variant name
 * @param description               Optional description
 * @param prixSupplement            Additional price for the variant
 * @param multiplicateurIngredient  Ingredient multiplier for this variant
 * @param disponible                Whether the variant is currently available
 * @param instructions              Optional preparation instructions
 * @param ingredients               Custom ingredients list for this variant
 */
public record CocktailVarianteRequestDTO(
    Long id,
    Long cocktailId,
    String nom,
    String description,
    BigDecimal prixSupplement,

    @DecimalMin(value = "0.0", inclusive = false, message = "Multiplier must be positive")
    BigDecimal multiplicateurIngredient,

    Boolean disponible,
    String instructions,
    List<CocktailVarianteIngredientRequestDTO> ingredients,
    List<CocktailRecipeStepRequestDTO> recipeSteps
) {
    /**
     * Backward-compatible 9-parameter constructor without recipeSteps.
     */
    public CocktailVarianteRequestDTO(
        Long id,
        Long cocktailId,
        String nom,
        String description,
        BigDecimal prixSupplement,
        BigDecimal multiplicateurIngredient,
        Boolean disponible,
        String instructions,
        List<CocktailVarianteIngredientRequestDTO> ingredients
    ) {
        this(id, cocktailId, nom, description, prixSupplement, multiplicateurIngredient, disponible, instructions, ingredients, null);
    }

    /**
     * Backward-compatible 8-parameter constructor without id and recipeSteps.
     */
    public CocktailVarianteRequestDTO(
        Long cocktailId,
        String nom,
        String description,
        BigDecimal prixSupplement,
        BigDecimal multiplicateurIngredient,
        Boolean disponible,
        String instructions,
        List<CocktailVarianteIngredientRequestDTO> ingredients
    ) {
        this(null, cocktailId, nom, description, prixSupplement, multiplicateurIngredient, disponible, instructions, ingredients, null);
    }

    /**
     * Backward-compatible 7-parameter constructor.
     */
    public CocktailVarianteRequestDTO(
        Long cocktailId,
        String nom,
        String description,
        BigDecimal prixSupplement,
        BigDecimal multiplicateurIngredient,
        Boolean disponible,
        String instructions
    ) {
        this(null, cocktailId, nom, description, prixSupplement, multiplicateurIngredient, disponible, instructions, null, null);
    }

    /**
     * Converts this DTO into a {@link CocktailVariante} JPA entity.
     *
     * @return A new {@link CocktailVariante} entity instance
     */
    public CocktailVariante toEntity() {
        CocktailVariante variante = new CocktailVariante();
        if (id != null) {
            variante.setId(id);
        }
        if (cocktailId != null) {
            Cocktail cocktail = new Cocktail();
            cocktail.setId(cocktailId);
            variante.setCocktail(cocktail);
        }
        variante.setNom(nom);
        variante.setDescription(description);
        variante.setPrixSupplement(prixSupplement != null ? prixSupplement : BigDecimal.ZERO);
        if (multiplicateurIngredient != null) {
            variante.setMultiplicateurIngredient(multiplicateurIngredient);
        }
        variante.setDisponible(!Boolean.FALSE.equals(disponible));
        variante.setInstructions(instructions);
        return variante;
    }
}
