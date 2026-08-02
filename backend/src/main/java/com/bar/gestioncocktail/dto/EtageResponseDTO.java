package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.EtageEntity;

import java.time.LocalDateTime;

/**
 * Data transfer object representing a floor response payload.
 *
 * @param id database primary key
 * @param code unique floor code identifier
 * @param nom human readable label
 * @param ordre sorting order index
 * @param createdAt creation timestamp
 * @param updatedAt last update timestamp
 */
public record EtageResponseDTO(
    Long id,
    String code,
    String nom,
    Integer ordre,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Factory method converting an {@link EtageEntity} into an {@link EtageResponseDTO}.
     *
     * @param entity the entity to map
     * @return response DTO representation
     */
    public static EtageResponseDTO from(EtageEntity entity) {
        if (entity == null) {
            return null;
        }
        return new EtageResponseDTO(
            entity.getId(),
            entity.getCode(),
            entity.getNom(),
            entity.getOrdre(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
