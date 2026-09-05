package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Response DTO describing a cocktail, pricing, ingredients, and variants.
 *
 * @param id Unique cocktail identifier
 * @param nom Commercial drink title
 * @param description Detailed description
 * @param prix Price including taxes in EUR
 * @param categorie Category (ALCOOLISE, SANS_ALCOOL, SHOT, APERITIF, DIGESTIF, SPECIAL)
 * @param disponible General availability flag
 * @param saisonnier Indicates whether the drink is seasonal
 * @param dateDebutSaison Season start date
 * @param dateFinSaison Season end date
 * @param moisDebut Season start month (1-12)
 * @param moisFin Season end month (1-12)
 * @param disponibleAujourdhui Availability calculation including seasonal schedule
 * @param instructions Preparation instructions for bartender
 * @param imageUrl Photo URL
 * @param ingredients List of recipe ingredients
 * @param variantes List of available variants
 * @param recipeSteps List of chronological recipe steps
 * @param createdAt Creation timestamp
 * @param updatedAt Modification timestamp
 */
@Schema(description = "Complete DTO representation of a cocktail")
public record CocktailResponseDTO(
    Long id,
    String nom,
    String description,
    BigDecimal prix,
    CocktailCategorie categorie,
    boolean disponible,
    boolean saisonnier,
    LocalDateTime dateDebutSaison,
    LocalDateTime dateFinSaison,
    Integer moisDebut,
    Integer moisFin,
    boolean disponibleAujourdhui,
    String instructions,
    String imageUrl,
    List<CocktailIngredientResponseDTO> ingredients,
    List<CocktailVarianteResponseDTO> variantes,
    List<CocktailRecipeStepResponseDTO> recipeSteps,
    GlasswareResponseDTO glassware,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Backward-compatible constructor without glassware.
     */
    public CocktailResponseDTO(
        Long id,
        String nom,
        String description,
        BigDecimal prix,
        CocktailCategorie categorie,
        boolean disponible,
        boolean saisonnier,
        LocalDateTime dateDebutSaison,
        LocalDateTime dateFinSaison,
        Integer moisDebut,
        Integer moisFin,
        boolean disponibleAujourdhui,
        String instructions,
        String imageUrl,
        List<CocktailIngredientResponseDTO> ingredients,
        List<CocktailVarianteResponseDTO> variantes,
        List<CocktailRecipeStepResponseDTO> recipeSteps,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(
            id, nom, description, prix, categorie, disponible, saisonnier,
            dateDebutSaison, dateFinSaison, moisDebut, moisFin, disponibleAujourdhui,
            instructions, imageUrl, ingredients, variantes, recipeSteps, null, createdAt, updatedAt
        );
    }

    /**
     * Converts a {@link Cocktail} entity into a response DTO.
     *
     * @param c Source cocktail entity
     * @return Corresponding response DTO
     */
    public static CocktailResponseDTO from(Cocktail c) {
        if (c == null) {
            return null;
        }
        List<CocktailIngredientResponseDTO> ings;
        try {
            ings = (c.getIngredients() != null)
                ? c.getIngredients().stream().map(CocktailIngredientResponseDTO::from).toList()
                : Collections.emptyList();
        } catch (Exception _) {
            ings = Collections.emptyList();
        }

        List<CocktailVarianteResponseDTO> vars;
        try {
            vars = (c.getVariantes() != null)
                ? c.getVariantes().stream().map(CocktailVarianteResponseDTO::from).toList()
                : Collections.emptyList();
        } catch (Exception _) {
            vars = Collections.emptyList();
        }

        List<CocktailRecipeStepResponseDTO> steps;
        try {
            steps = (c.getRecipeSteps() != null)
                ? c.getRecipeSteps().stream().map(CocktailRecipeStepResponseDTO::from).toList()
                : Collections.emptyList();
        } catch (Exception _) {
            steps = Collections.emptyList();
        }

        GlasswareResponseDTO glassDto = GlasswareResponseDTO.from(c.getGlassware());

        return new CocktailResponseDTO(
            c.getId(), c.getNom(), c.getDescription(), c.getPrix(), c.getCategorie(),
            c.isDisponible(), c.isSaisonnier(), c.getDateDebutSaison(), c.getDateFinSaison(),
            c.getMoisDebut(), c.getMoisFin(), c.isDisponibleAujourdhui(),
            c.getInstructions(), c.getImageUrl(), ings, vars, steps, glassDto, c.getCreatedAt(), c.getUpdatedAt()
        );
    }
}
