package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Reservation;
import com.bar.gestioncocktail.model.ReservationStatut;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Data Transfer Object representing a table reservation details.
 *
 * @param id               Unique reservation identifier
 * @param nomClient        Customer full name
 * @param telephone        Contact phone number
 * @param email            Contact email address
 * @param dateReservation  Booked date
 * @param heureReservation Booked start time
 * @param dureeMinutes     Reservation turnaround duration in minutes
 * @param nombrePersonnes  Party size / guest count
 * @param notes            Special requests or dietary requirements
 * @param statut           Current reservation lifecycle state
 * @param tableId          Assigned table identifier (nullable if unassigned)
 * @param tableNumero      Assigned table number (nullable if unassigned)
 * @param tableCapacite    Assigned table seating capacity (nullable if unassigned)
 * @param tableZone        Assigned table room/zone name (nullable if unassigned)
 * @param createdAt        Creation timestamp
 * @param updatedAt        Last update timestamp
 */
public record ReservationDTO(
        Long id,
        String nomClient,
        String telephone,
        String email,
        LocalDate dateReservation,
        LocalTime heureReservation,
        Integer dureeMinutes,
        Integer nombrePersonnes,
        String notes,
        ReservationStatut statut,
        Long tableId,
        Integer tableNumero,
        Integer tableCapacite,
        String tableZone,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    /**
     * Converts a {@link Reservation} entity to its DTO representation.
     *
     * @param entity The source reservation entity
     * @return Transformed reservation DTO or null if entity is null
     */
    public static ReservationDTO from(Reservation entity) {
        if (entity == null) {
            return null;
        }
        Long tableId = entity.getTable() != null ? entity.getTable().getId() : null;
        Integer tableNumero = entity.getTable() != null ? entity.getTable().getNumero() : null;
        Integer tableCapacite = entity.getTable() != null ? entity.getTable().getCapacite() : null;
        String tableZone = entity.getTable() != null ? entity.getTable().getZone() : null;

        return new ReservationDTO(
                entity.getId(),
                entity.getNomClient(),
                entity.getTelephone(),
                entity.getEmail(),
                entity.getDateReservation(),
                entity.getHeureReservation(),
                entity.getDureeMinutes(),
                entity.getNombrePersonnes(),
                entity.getNotes(),
                entity.getStatut(),
                tableId,
                tableNumero,
                tableCapacite,
                tableZone,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
