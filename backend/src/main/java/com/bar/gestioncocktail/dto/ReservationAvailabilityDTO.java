package com.bar.gestioncocktail.dto;

import java.util.List;

/**
 * Result DTO for checking table booking availability and capacity suitability.
 *
 * @param available           Whether the table is free with no conflicting overlapping reservations
 * @param capacitySufficient  Whether the table capacity accommodates the requested party size
 * @param conflictingBookings List of overlapping reservations if any
 * @param message             Human-readable summary message
 */
public record ReservationAvailabilityDTO(
        boolean available,
        boolean capacitySufficient,
        List<ReservationDTO> conflictingBookings,
        String message
) {
}
