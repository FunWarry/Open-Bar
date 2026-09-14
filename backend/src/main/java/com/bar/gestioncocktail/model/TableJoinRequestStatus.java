package com.bar.gestioncocktail.model;

/**
 * Status lifecycle for table join authorization requests.
 */
public enum TableJoinRequestStatus {
    /** Request is awaiting approval from the table owner. */
    PENDING,

    /** Request was approved by the table owner, granting access to the table session token. */
    APPROVED,

    /** Request was rejected by the table owner. */
    REJECTED
}
