package com.bar.gestioncocktail.model;

/**
 * Lifecycle status of a physical cash drawer register session.
 */
public enum CashDrawerSessionStatus {

    /**
     * Cash drawer is currently active and open for daily transactions and cash movements.
     */
    OPEN,

    /**
     * Cash drawer session has been officially closed and audited (e.g. via Z-Report).
     */
    CLOSED
}
