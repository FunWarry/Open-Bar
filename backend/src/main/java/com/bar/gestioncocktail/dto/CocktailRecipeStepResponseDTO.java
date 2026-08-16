package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CocktailRecipeStep;
import com.bar.gestioncocktail.model.RecipeStepType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO describing a configured step in a cocktail recipe.
 *
 * @param id Unique step identifier
 * @param cocktailId Associated cocktail identifier
 * @param stepOrder Chronological order index (1-based)
 * @param stepType Type of block (INGREDIENT, ACTION_TEMPLATE, CUSTOM_TEXT)
 * @param ingredientId Associated ingredient identifier if INGREDIENT block
 * @param ingredientName Associated ingredient name if INGREDIENT block
 * @param quantite Ingredient dosage for 1 cocktail portion
 * @param unite Measurement unit (cl, ml, g, dashes, leaves, etc.)
 * @param templateId Associated reusable template identifier if ACTION_TEMPLATE block
 * @param template Attached template details
 * @param actionTitle Custom action title
 * @param customText Freeform notes/instructions
 * @param durationSeconds Estimated execution duration in seconds
 * @param createdAt Creation timestamp
 * @param updatedAt Modification timestamp
 */
@Schema(description = "DTO representation of an ordered cocktail recipe step")
public record CocktailRecipeStepResponseDTO(
    Long id,
    Long cocktailId,
    Integer stepOrder,
    RecipeStepType stepType,
    Long ingredientId,
    String ingredientName,
    BigDecimal quantite,
    String unite,
    Long templateId,
    RecipeStepTemplateResponseDTO template,
    String actionTitle,
    String customText,
    Integer durationSeconds,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Converts a {@link CocktailRecipeStep} entity into a response DTO.
     *
     * @param s Source step entity
     * @return Corresponding response DTO
     */
    public static CocktailRecipeStepResponseDTO from(CocktailRecipeStep s) {
        if (s == null) return null;
        return new CocktailRecipeStepResponseDTO(
            s.getId(),
            s.getCocktail() != null ? s.getCocktail().getId() : null,
            s.getStepOrder(),
            s.getStepType(),
            s.getIngredient() != null ? s.getIngredient().getId() : null,
            s.getIngredient() != null ? s.getIngredient().getNom() : null,
            s.getQuantite(),
            s.getUnite(),
            s.getTemplate() != null ? s.getTemplate().getId() : null,
            RecipeStepTemplateResponseDTO.from(s.getTemplate()),
            s.getActionTitle(),
            s.getCustomText(),
            s.getDurationSeconds(),
            s.getCreatedAt(),
            s.getUpdatedAt()
        );
    }
}
