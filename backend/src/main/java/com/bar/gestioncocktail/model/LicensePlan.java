package com.bar.gestioncocktail.model;

/**
 * Commercial and community subscription tiers recognized by the OpenBar licensing engine.
 */
public enum LicensePlan {
    /**
     * Free community, personal evaluation, or non-profit volunteer association tier.
     */
    COMMUNITY,

    /**
     * Essential bar POS subscription tier with core table, cocktail, and billing capabilities.
     */
    ESSENTIAL,

    /**
     * Professional bar/brasserie tier unlocking KDS, stock tracking, suppliers, and reservations.
     */
    PRO,

    /**
     * Full enterprise subscription tier unlocking all OpenBar capabilities without restrictions.
     */
    ENTERPRISE
}
