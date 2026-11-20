package com.bar.gestioncocktail.model;

/**
 * Originating payment channel for a sealed card transaction in the commission ledger.
 */
public enum CardCommissionSource {
    /**
     * Local traditional bank TPE settled via Concert IP TCP handshake.
     */
    CONCERT_IP_TPE,

    /**
     * POS card settlement recorded manually without Concert IP handshake telemetry.
     */
    MANUAL_CB,

    /**
     * Smart Android terminal settled through Stripe Terminal Connect with automatic platform fee split.
     */
    STRIPE_TERMINAL_CONNECT
}
