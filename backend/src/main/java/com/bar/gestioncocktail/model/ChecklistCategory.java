package com.bar.gestioncocktail.model;

/**
 * Operational categories / phases for establishment checklists and standard operating procedures (SOP).
 */
public enum ChecklistCategory {
    /**
     * Morning or pre-service preparation and setup procedures.
     */
    OPENING,

    /**
     * End-of-day, shutdown, and nightly security/cleanup procedures.
     */
    CLOSING,

    /**
     * Mid-shift handover, break routines, or afternoon transition checklists.
     */
    MID_SHIFT,

    /**
     * Sanitation, HACCP hygiene controls, and routine deep cleaning routines.
     */
    CLEANING_HYGIENE,

    /**
     * Safety, fire checks, and preventative equipment maintenance procedures.
     */
    SAFETY_MAINTENANCE,

    /**
     * General or miscellaneous operational routines.
     */
    OTHER
}
