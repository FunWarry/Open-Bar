package com.bar.gestioncocktail.model;

/**
 * Type of recipe block step in cocktail preparation.
 */
public enum RecipeStepType {
    /** Ingredient addition step with quantity and unit. */
    INGREDIENT,
    /** Reusable mixology action step linked to a template. */
    ACTION_TEMPLATE,
    /** Freeform custom instruction text step. */
    CUSTOM_TEXT
}
