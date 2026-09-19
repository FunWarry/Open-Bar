package com.bar.gestioncocktail.model;

/**
 * Operational status for customer bar tabs and running ledgers.
 */
public enum BarTabStatus {

    /**
     * Tab is active, open, and accepting orders/drinks.
     */
    ACTIVE,

    /**
     * Tab has been fully settled and closed with a generated customer invoice.
     */
    SETTLED,

    /**
     * Tab orders have been transferred to a physical table or another tab.
     */
    TRANSFERRED,

    /**
     * Tab was cancelled or voided without billing.
     */
    CANCELLED
}
