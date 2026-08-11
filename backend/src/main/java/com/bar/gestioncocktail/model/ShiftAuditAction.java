package com.bar.gestioncocktail.model;

/**
 * Enumeration representing actions performed on an employee work shift for audit logging.
 */
public enum ShiftAuditAction {
    /**
     * A new shift was created.
     */
    CREATED,

    /**
     * An existing shift was updated.
     */
    UPDATED,

    /**
     * An existing shift was deleted.
     */
    DELETED
}
