package com.bar.gestioncocktail.model;

/**
 * Operational states of an OpenBar venue license.
 */
public enum LicenseStatus {
    /**
     * Cryptographically valid license within its active subscription period.
     */
    VALID,

    /**
     * Subscription expiration timestamp has passed, but the venue is inside the 2-day grace period.
     * Order creation remains permitted with administrative warning banners.
     */
    GRACE_PERIOD,

    /**
     * Subscription expiration plus grace period have elapsed; order creation is locked
     * while historical invoices, Z-reports, and audit exports remain accessible.
     */
    EXPIRED,

    /**
     * No commercial license token is installed while license enforcement is enabled.
     */
    UNLICENSED,

    /**
     * OpenBar is running in non-enforced evaluation, development, or non-profit community mode.
     */
    COMMUNITY,

    /**
     * Stored or submitted license token failed cryptographic or establishment validation.
     */
    INVALID
}
