package com.bar.gestioncocktail.model;

/**
 * Settlement and billing lifecycle state of a recorded card transaction commission entry.
 */
public enum CardCommissionStatus {
    /**
     * Recorded locally in the SHA-256 ledger and pending online sync or offline monthly Z-report export.
     */
    ACCUMULATED,

    /**
     * Transmitted to the central OpenBar Stripe Billing service via online synchronization.
     */
    SYNCED_ONLINE,

    /**
     * Included in a signed offline monthly Z-report proof bundle exported for manual openbar.fr portal renewal.
     */
    EXPORTED_OFFLINE,

    /**
     * Automatically deducted at the source via Stripe Terminal Connect application_fee_amount.
     */
    SETTLED_AT_SOURCE,

    /**
     * Billed on a pending monthly commission invoice awaiting payment confirmation.
     */
    INVOICED_PENDING
}
