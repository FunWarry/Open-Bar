package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ReservationStatut;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Payload record for updating an existing table reservation.
 *
 * @param nomClient        Customer full name
 * @param telephone        Contact phone number
 * @param email            Contact email address
 * @param dateReservation  Date of reservation
 * @param heureReservation Start time of reservation
 * @param dureeMinutes     Duration in minutes
 * @param nombrePersonnes  Number of guests
 * @param notes            Special requests or dietary notes
 * @param statut           Reservation lifecycle state
 * @param tableId          Target table ID (nullable to unassign)
 */
public record ReservationUpdateRequest(
        @NotBlank(message = "Customer name is required")
        @Size(max = 100, message = "Customer name cannot exceed 100 characters")
        String nomClient,

        @Size(max = 50, message = "Phone number cannot exceed 50 characters")
        String telephone,

        @Size(max = 150, message = "Email cannot exceed 150 characters")
        String email,

        @NotNull(message = "Reservation date is required")
        LocalDate dateReservation,

        @NotNull(message = "Reservation time is required")
        LocalTime heureReservation,

        @NotNull(message = "Duration in minutes is required")
        @Min(value = 15, message = "Duration must be at least 15 minutes")
        Integer dureeMinutes,

        @NotNull(message = "Party size is required")
        @Min(value = 1, message = "Party size must be at least 1 person")
        Integer nombrePersonnes,

        String notes,

        @NotNull(message = "Reservation status is required")
        ReservationStatut statut,

        Long tableId
) {
}
