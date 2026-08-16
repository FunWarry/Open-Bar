package com.bar.gestioncocktail.model;

/**
 * Standard mixology action categories for reusable recipe step templates.
 */
public enum RecipeStepActionType {
    /** Vigorously shaking ingredients with ice in a cocktail shaker. */
    SHAKE,
    /** Straining liquid through a Hawthorne or fine mesh strainer. */
    STRAIN,
    /** Gently crushing ingredients at the bottom of the glass or tin. */
    MUDDLE,
    /** Chilling and blending with a bar spoon in a mixing glass. */
    STIR,
    /** Adding cubed or crushed ice into the glassware or shaker. */
    ADD_ICE,
    /** Pouring liquid directly into the serving glass. */
    POUR,
    /** Topping off with carbonated beverage, tonic, soda or champagne. */
    TOP_UP,
    /** Placing decorative garnish (citrus wheel, twist, mint bouquet). */
    GARNISH,
    /** Electric blending (frozen cocktails, frappés). */
    BLEND,
    /** Expressing citrus oils or flaming peel over the drink. */
    FLAME,
    /** Other specialized preparation technique. */
    OTHER
}
