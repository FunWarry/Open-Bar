package com.bar.gestioncocktail.model;

/**
 * Dual-tier TPE payment monetization tiers supported by OpenBar.
 */
public enum TpeMonetizationTier {
    /**
     * Option 1: Traditional bank TPE via local Concert IP protocol or manual CB audit ledger.
     * Higher commission tier (default 1.20% + €0.10) billed via online sync or offline Z-report portal upload.
     */
    CONCERT_IP_OFFLINE,

    /**
     * Option 3: Turnkey Smart Android TPE via Stripe Terminal Connect (white-label PayFac).
     * Lower commission tier (default 0.45% + €0.05) automatically deducted at the source via application_fee_amount.
     */
    STRIPE_TERMINAL_CONNECT
}
