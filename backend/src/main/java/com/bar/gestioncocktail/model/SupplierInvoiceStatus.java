package com.bar.gestioncocktail.model;

/**
 * Lifecycle status of a supplier invoice imported into the procurement system.
 */
public enum SupplierInvoiceStatus {

    /**
     * Freshly parsed invoice awaiting manager review and reconciliation against purchase orders.
     */
    PENDING_REVIEW,

    /**
     * Line items reconciled with purchase order and delivery receipt within acceptable thresholds.
     */
    RECONCILED,

    /**
     * Reconciled with detected variances (price/quantity) that have been manually confirmed with justification.
     */
    DISCREPANCY_CONFIRMED,

    /**
     * Formally approved, resulting in stock intake and Weighted Average Unit Cost (PAMP/WAC) recalculation.
     */
    APPLIED,

    /**
     * Invoice rejected due to critical non-conformity or supplier dispute.
     */
    REJECTED
}
