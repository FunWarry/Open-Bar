package com.bar.gestioncocktail.model;

/**
 * Lifecycle statuses of a supplier purchase order and goods receipt intake.
 */
public enum PurchaseOrderStatus {
    /**
     * Purchase order draft created by bar management, not yet dispatched to supplier.
     */
    DRAFT,

    /**
     * Purchase order officially confirmed and transmitted to supplier, awaiting physical goods arrival.
     */
    ORDERED,

    /**
     * Partial shipment received and checked in. Quantities received credited to inventory,
     * remaining balance awaiting future shipment.
     */
    PARTIALLY_RECEIVED,

    /**
     * Final delivery completed and validated. Active inventory replenished and Weighted Average Unit Cost (PAMP) updated.
     */
    RECEIVED,

    /**
     * Order cancelled before or after transmission.
     */
    CANCELLED
}
