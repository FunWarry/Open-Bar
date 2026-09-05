package com.bar.gestioncocktail.model;

/**
 * Enumeration representing the type of alert triggered by a patron from a table QR code.
 */
public enum TableAppelType {
    /** Patron is requesting waiter assistance at the table. */
    ASSISTANCE,
    /** Patron is requesting the bill / check to settle payment. */
    ADDITION
}
