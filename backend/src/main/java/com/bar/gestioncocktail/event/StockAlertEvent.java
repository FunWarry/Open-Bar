package com.bar.gestioncocktail.event;

/**
 * Domain event published when an ingredient stock level drops below its configured alert threshold.
 *
 * @param ingredientId     The ingredient identifier
 * @param nomIngredient    The name of the ingredient
 * @param quantiteRestante The remaining stock quantity
 */
public record StockAlertEvent(
        Long ingredientId,
        String nomIngredient,
        double quantiteRestante
) {
}
