package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CocktailVariante;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Response DTO representing a cocktail variant with its customized ingredients, mixology steps, and metadata.
 *
 * @param id                        Variant identifier
 * @param cocktailId                Parent cocktail identifier
 * @param nom                       Variant name
 * @param description               Variant description
 * @param prixSupplement            Additional surcharge price
 * @param multiplicateurIngredient  Ingredient dosage multiplier
 * @param disponible                Availability status
 * @param instructions              Preparation instructions
 * @param ingredients               List of customized ingredients for this variant
 * @param recipeSteps               Complete ordered list of mixology recipe steps for this variant
 * @param createdAt                 Creation timestamp
 * @param updatedAt                 Last update timestamp
 */
public record CocktailVarianteResponseDTO(
    Long id,
    Long cocktailId,
    String nom,
    String description,
    BigDecimal prixSupplement,
    BigDecimal multiplicateurIngredient,
    boolean disponible,
    String instructions,
    List<CocktailVarianteIngredientResponseDTO> ingredients,
    List<CocktailRecipeStepResponseDTO> recipeSteps,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().findAndRegisterModules();

    /**
     * Backward-compatible 11-parameter constructor without recipeSteps.
     */
    public CocktailVarianteResponseDTO(
        Long id,
        Long cocktailId,
        String nom,
        String description,
        BigDecimal prixSupplement,
        BigDecimal multiplicateurIngredient,
        boolean disponible,
        String instructions,
        List<CocktailVarianteIngredientResponseDTO> ingredients,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(id, cocktailId, nom, description, prixSupplement, multiplicateurIngredient, disponible, instructions, ingredients, List.of(), createdAt, updatedAt);
    }

    /**
     * Backward-compatible 10-parameter constructor without ingredients or recipeSteps.
     */
    public CocktailVarianteResponseDTO(
        Long id,
        Long cocktailId,
        String nom,
        String description,
        BigDecimal prixSupplement,
        BigDecimal multiplicateurIngredient,
        boolean disponible,
        String instructions,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(id, cocktailId, nom, description, prixSupplement, multiplicateurIngredient, disponible, instructions, List.of(), List.of(), createdAt, updatedAt);
    }

    /**
     * Creates a {@link CocktailVarianteResponseDTO} from a {@link CocktailVariante} entity.
     *
     * @param v The entity to convert
     * @return The populated response DTO
     */
    public static CocktailVarianteResponseDTO from(CocktailVariante v) {
        if (v == null) {
            return null;
        }
        List<CocktailVarianteIngredientResponseDTO> ingredientsList = (v.getIngredients() != null)
            ? v.getIngredients().stream().map(CocktailVarianteIngredientResponseDTO::from).toList()
            : List.of();

        List<CocktailRecipeStepResponseDTO> parsedSteps = new ArrayList<>();
        if (v.getRecipeStepsJson() != null && !v.getRecipeStepsJson().trim().isEmpty()) {
            try {
                List<CocktailRecipeStepResponseDTO> decoded = OBJECT_MAPPER.readValue(
                    v.getRecipeStepsJson(),
                    new TypeReference<List<CocktailRecipeStepResponseDTO>>() {}
                );
                if (decoded != null) {
                    parsedSteps.addAll(decoded);
                }
            } catch (Exception _) {
                // Silently ignore corrupted JSON and fallback to empty steps
            }
        }

        return new CocktailVarianteResponseDTO(
            v.getId(),
            v.getCocktail() != null ? v.getCocktail().getId() : null,
            v.getNom(),
            v.getDescription(),
            v.getPrixSupplement(),
            v.getMultiplicateurIngredient(),
            v.isDisponible(),
            v.getInstructions(),
            ingredientsList,
            parsedSteps,
            v.getCreatedAt(),
            v.getUpdatedAt()
        );
    }
}
