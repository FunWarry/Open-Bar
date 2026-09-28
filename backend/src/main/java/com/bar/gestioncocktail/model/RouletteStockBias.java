package com.bar.gestioncocktail.model;

/**
 * Intensity of the stock depletion bias algorithm for roulette spins.
 */
public enum RouletteStockBias {
    /**
     * Equal probability across all eligible catalog drinks (100% fair random).
     */
    EQUAL,

    /**
     * Moderate weight multiplier (2x) for drinks containing overstocked or near-expiry ingredients.
     */
    BALANCED,

    /**
     * Aggressive weight multiplier (5x) heavily prioritizing drinks containing overstocked and near-expiry spirits.
     */
    AGGRESSIVE
}
