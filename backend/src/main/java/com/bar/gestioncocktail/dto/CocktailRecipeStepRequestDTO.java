package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.RecipeStepType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request DTO for configuring an individual step block within a cocktail recipe.
 *
 * @param stepOrder Sequential order index (1, 2, 3...)
 * @param stepType Type of block (INGREDIENT, ACTION_TEMPLATE, CUSTOM_TEXT)
 * @param ingredientId Linked ingredient ID (if stepType == INGREDIENT)
 * @param quantite Ingredient quantity for 1 serving
 * @param unite Measurement unit
 * @param templateId Linked reusable template ID (if stepType == ACTION_TEMPLATE)
 * @param actionTitle Override or custom title for the action
 * @param customText Freeform instruction text
 * @param durationSeconds Execution duration in seconds
 */
@Schema(description = "Request DTO for defining an ordered step block in a recipe")
public record CocktailRecipeStepRequestDTO(
    @NotNull(message = "Step order is required")
    Integer stepOrder,

    @NotNull(message = "Step type is required")
    RecipeStepType stepType,

    Long ingredientId,

    BigDecimal quantite,

    @Size(max = 20, message = "Unit cannot exceed 20 characters")
    String unite,

    Long templateId,

    @Size(max = 100, message = "Action title cannot exceed 100 characters")
    String actionTitle,

    String customText,

    Integer durationSeconds
) {}
