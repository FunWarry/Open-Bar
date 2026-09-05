package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.FlavorProfile;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Response DTO describing a cocktail, pricing, ingredients, variants, flavor profiles, and dietary tags.
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
 * @param glassware Serving glassware details
 * @param flavorProfiles Set of flavor profile tags (FRUITY, SMOKY, etc.)
 * @param alcoholLevel Alcohol by volume percentage (ABV)
 * @param isMocktail True if drink is non-alcoholic mocktail
 * @param isVegan True if drink is vegan friendly
 * @param isGlutenFree True if drink is gluten-free
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
    Set<FlavorProfile> flavorProfiles,
    BigDecimal alcoholLevel,
    boolean isMocktail,
    boolean isVegan,
    boolean isGlutenFree,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Backward-compatible constructor without glassware or flavor/dietary fields.
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
            instructions, imageUrl, ingredients, variantes, recipeSteps, null,
            Collections.emptySet(), BigDecimal.ZERO, false, true, true, createdAt, updatedAt
        );
    }

    /**
     * Backward-compatible constructor without flavor/dietary fields.
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
        GlasswareResponseDTO glassware,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(
            id, nom, description, prix, categorie, disponible, saisonnier,
            dateDebutSaison, dateFinSaison, moisDebut, moisFin, disponibleAujourdhui,
            instructions, imageUrl, ingredients, variantes, recipeSteps, glassware,
            Collections.emptySet(), BigDecimal.ZERO, false, true, true, createdAt, updatedAt
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

        Set<FlavorProfile> flavors;
        try {
            flavors = (c.getFlavorProfiles() != null)
                ? new HashSet<>(c.getFlavorProfiles())
                : Collections.emptySet();
        } catch (Exception _) {
            flavors = Collections.emptySet();
        }

        return new CocktailResponseDTO(
            c.getId(), c.getNom(), c.getDescription(), c.getPrix(), c.getCategorie(),
            c.isDisponible(), c.isSaisonnier(), c.getDateDebutSaison(), c.getDateFinSaison(),
            c.getMoisDebut(), c.getMoisFin(), c.isDisponibleAujourdhui(),
            c.getInstructions(), c.getImageUrl(), ings, vars, steps, glassDto,
            flavors,
            c.getAlcoholLevel() != null ? c.getAlcoholLevel() : BigDecimal.ZERO,
            c.isMocktail(),
            c.isVegan(),
            c.isGlutenFree(),
            c.getCreatedAt(),
            c.getUpdatedAt()
        );
    }
}
