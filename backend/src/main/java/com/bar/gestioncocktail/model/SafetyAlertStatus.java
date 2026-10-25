package com.bar.gestioncocktail.model;

/**
 * Enumeration representing the lifecycle state of a patron safety alert.
 */
public enum SafetyAlertStatus {

    /**
     * Safety alert is active, unacknowledged, and awaiting immediate staff attendance.
     */
    ACTIVE,

    /**
     * Safety alert has been acknowledged, investigated, and marked resolved by staff.
     */
    RESOLVED
}
