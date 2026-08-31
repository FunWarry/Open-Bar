package com.bar.gestioncocktail.model;

/**
 * Enumeration representing the processing lifecycle status of a table alert.
 */
public enum TableAppelStatut {
    /** Alert is newly received and awaiting waitstaff attendance. */
    EN_ATTENTE,
    /** Alert has been acknowledged / handled by a server. */
    ACQUITTE,
    /** Alert was dismissed or cancelled. */
    ANNULE
}
