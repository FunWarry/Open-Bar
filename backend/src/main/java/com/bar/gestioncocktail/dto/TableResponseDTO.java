package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TableEntity;
import java.time.LocalDateTime;

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
    public static TableResponseDTO from(TableEntity t) {
        return new TableResponseDTO(
            t.getId(), t.getNumero(), t.getCapacite(), t.getZone(), t.isOccupee(),
            t.getServeurId(), t.getDateOccupation(), t.getDateLiberation(),
            t.getCreatedAt(), t.getUpdatedAt()
        );
    }
}
