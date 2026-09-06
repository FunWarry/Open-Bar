package com.bar.gestioncocktail.model;

/**
 * Enumerates the calculation modes applied to product prices during active Happy Hour windows.
 */
public enum DiscountType {
    /**
     * Percentage deduction off the base price (e.g., 20% discount).
     */
    PERCENTAGE,

    /**
     * Promotional fixed sale price (e.g., all eligible cocktails sold for 5.00 EUR).
     */
    FIXED_PRICE,

    /**
     * Flat amount deducted from the base price (e.g., 2.00 EUR discount).
     */
    FIXED_DISCOUNT
}
