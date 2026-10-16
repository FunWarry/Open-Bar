package com.bar.gestioncocktail.model;

/**
 * Lifecycle status of a table reservation in the establishment.
 */
public enum ReservationStatut {
    /**
     * Initial reservation recorded and awaiting final confirmation or check-in.
     */
    PENDING,

    /**
     * Reservation confirmed by staff or patron.
     */
    CONFIRMED,

    /**
     * Guests have arrived and have been seated at their assigned table.
     */
    SEATED,

    /**
     * Reservation cancelled by guest or establishment.
     */
    CANCELLED,

    /**
     * Guests failed to arrive without prior cancellation.
     */
    NO_SHOW
}
