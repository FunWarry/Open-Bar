package com.bar.gestioncocktail.model;

/**
 * Functional roles assigned to physical ESC/POS thermal receipt printers across the establishment.
 */
public enum PrinterRole {
    /**
     * Dedicated counter printer preparing beverage, beer, and cocktail tickets.
     */
    BAR,

    /**
     * Dedicated kitchen or snack workstation printer preparing food tickets.
     */
    KITCHEN,

    /**
     * Main cash desk counter printer printing customer receipts and triggering cash drawer kicks.
     */
    CASH_DESK
}
