package com.bar.gestioncocktail.model;

/**
 * Currency symbol display position relative to the formatted monetary amount.
 */
public enum CurrencyPosition {
    /**
     * Currency symbol displayed before the amount (e.g. "$ 12.50" or "$12.50").
     */
    BEFORE,

    /**
     * Currency symbol displayed after the amount (e.g. "12.50 €" or "12.50 CHF").
     */
    AFTER
}
