package com.bar.gestioncocktail.model;

/**
 * Enumeration of reward types awarded by the cocktail roulette wheel.
 */
public enum RoulettePrizeType {
    /**
     * Standard catalog cocktail won at a discounted price.
     */
    COCKTAIL,

    /**
     * Bartender's special creation tailored to slow-moving or near-expiry spirits.
     */
    BARTENDER_SPECIAL,

    /**
     * Free or special shooter round.
     */
    SHOOTER,

    /**
     * Custom establishment reward or promotional prize (e.g. snack, discount, house bonus).
     */
    CUSTOM_REWARD
}
