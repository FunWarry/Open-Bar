package com.bar.gestioncocktail.model;

/**
 * Declared reasons for stock shrinkage, breakage, and waste in OpenBar.
 */
public enum StockWasteReason {
    /**
     * Accidental breakage of bottles or containers.
     */
    CASSE,

    /**
     * Expired ingredients past their shelf life or best before date.
     */
    PEREMPTION,

    /**
     * Complimentary drinks or round offered by the house ("Tournée du patron").
     */
    OFFERT_PATRON,

    /**
     * Staff tastings, menu evaluations, and team training sessions.
     */
    DEGUSTATION_STAFF,

    /**
     * Preparation errors, spills, or remade cocktails.
     */
    ERREUR_PREPARATION
}
