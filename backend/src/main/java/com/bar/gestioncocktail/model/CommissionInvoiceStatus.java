package com.bar.gestioncocktail.model;

/**
 * Billing status of a monthly TPE commission invoice for an establishment.
 */
public enum CommissionInvoiceStatus {
    /**
     * No pending commission invoice for the billing period.
     */
    NONE,

    /**
     * Commission invoice has been issued and is awaiting payment within normal terms.
     */
    PENDING,

    /**
     * Payment is past due or pending renewal within the grace period; warning banners are shown.
     */
    GRACE_PERIOD,

    /**
     * Grace period has elapsed without settlement; TPE card payments may be locked if enforce-grace-lock is active.
     */
    OVERDUE,

    /**
     * Commission invoice for this period has been settled in full.
     */
    SETTLED
}
