package com.bar.gestioncocktail.model;

/**
 * Lifecycle status of an operational checklist run instance.
 */
public enum ChecklistRunStatus {
    /**
     * The checklist run is actively being executed by staff.
     */
    IN_PROGRESS,

    /**
     * All mandatory tasks have been completed and the run was finalized.
     */
    COMPLETED,

    /**
     * The run was aborted or invalidated.
     */
    CANCELLED
}
