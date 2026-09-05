package com.bar.gestioncocktail.model;

/**
 * Status of an ephemeral table session.
 */
public enum TableSessionStatus {
    /**
     * The table session is currently active and eligible for order placement.
     */
    ACTIVE,

    /**
     * The table session has been closed upon bill payment or table liberation.
     */
    CLOSED,

    /**
     * The table session has reached its expiration time limit.
     */
    EXPIRED
}
