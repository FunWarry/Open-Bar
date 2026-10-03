package com.bar.gestioncocktail.model;

/**
 * Status lifecycle enumeration for periodic physical stock inventory audits.
 */
public enum InventoryAuditStatus {

    /**
     * Initial draft state; audit sheet is created and theoretical stock is snapshotted,
     * but physical counts are not yet finalized.
     */
    DRAFT,

    /**
     * Active inventory audit session currently being counted across storage locations.
     */
    IN_PROGRESS,

    /**
     * Finalized audit session; physical counts are verified, theoretical vs actual variances
     * are locked, and compensating stock movements are committed.
     */
    FINALIZED,

    /**
     * Cancelled audit session discarded without adjusting inventory balances.
     */
    CANCELLED
}
