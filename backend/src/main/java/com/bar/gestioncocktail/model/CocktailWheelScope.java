package com.bar.gestioncocktail.model;

/**
 * Scope selector for the cocktail ingredient connection wheel graph.
 */
public enum CocktailWheelScope {
    /**
     * Master cocktail library catalog containing ~1900 international and craft cocktail templates.
     */
    LIBRARY,

    /**
     * Establishment catalog containing all cocktails configured and served in the bar.
     */
    ESTABLISHMENT;

    /**
     * Parses a string scope into an enum value with case-insensitivity and default fallback.
     *
     * @param scope Scope string value
     * @return Corresponding CocktailWheelScope (defaults to LIBRARY if invalid or null)
     */
    public static CocktailWheelScope fromString(String scope) {
        if (scope == null || scope.isBlank()) {
            return LIBRARY;
        }
        String normalized = scope.trim().toUpperCase();
        if ("ESTABLISHMENT".equals(normalized) || "ACTIVE".equals(normalized)) {
            return ESTABLISHMENT;
        }
        return LIBRARY;
    }
}
