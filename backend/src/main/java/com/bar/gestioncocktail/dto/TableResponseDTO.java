package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TableEntity;
import java.time.LocalDateTime;

/**
 * Data Transfer Object representing table details and occupation state.
 *
 * @param id Unique table identifier
 * @param numero Table visual/physical number
 * @param capacite Seating capacity
 * @param zone Floor plan zone
 * @param occupee Occupation status flag
 * @param serveurId Assigned server identifier
 * @param dateOccupation Timestamp when table became occupied
 * @param dateLiberation Timestamp when table was cleared/freed
 * @param createdAt Creation timestamp
 * @param updatedAt Last update timestamp
 */
public record TableResponseDTO(
    Long id,
    Integer numero,
    Integer capacite,
    String zone,
    boolean occupee,
    Long serveurId,
    LocalDateTime dateOccupation,
    LocalDateTime dateLiberation,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Maps a TableEntity to a TableResponseDTO.
     *
     * @param t Table entity, nullable
     * @return TableResponseDTO or null if entity is null
     */
    public static TableResponseDTO from(TableEntity t) {
        if (t == null) {
            return null;
        }
        return new TableResponseDTO(
            t.getId(), t.getNumero(), t.getCapacite(), t.getZone(), t.isOccupee(),
            t.getServeurId(), t.getDateOccupation(), t.getDateLiberation(),
            t.getCreatedAt(), t.getUpdatedAt()
        );
    }
}
