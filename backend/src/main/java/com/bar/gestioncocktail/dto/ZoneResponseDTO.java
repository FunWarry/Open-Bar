package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ZoneEntity;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for zone information.
 *
 * @param id Unique zone identifier
 * @param nom Display name of the zone
 * @param etage Associated floor level
 * @param planX X position on floor plan
 * @param planY Y position on floor plan
 * @param planWidth Width on floor plan
 * @param planHeight Height on floor plan
 * @param shapeType Geometry shape type
 * @param pointsJson Polygon coordinates JSON
 * @param cornerRadiiJson Corner radius definitions
 * @param couleur Hex accent color code
 * @param createdAt Creation timestamp
 * @param updatedAt Last update timestamp
 */
public record ZoneResponseDTO(
    Long id,
    String nom,
    String etage,
    Double planX,
    Double planY,
    Double planWidth,
    Double planHeight,
    String shapeType,
    String pointsJson,
    String cornerRadiiJson,
    String couleur,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Creates a {@link ZoneResponseDTO} from a JPA {@link ZoneEntity}.
     *
     * @param entity Source JPA zone entity
     * @return Transformed DTO or null
     */
    public static ZoneResponseDTO from(ZoneEntity entity) {
        if (entity == null) {
            return null;
        }
        return new ZoneResponseDTO(
            entity.getId(),
            entity.getNom(),
            entity.getEtage(),
            entity.getPlanX(),
            entity.getPlanY(),
            entity.getPlanWidth(),
            entity.getPlanHeight(),
            entity.getShapeType(),
            entity.getPointsJson(),
            entity.getCornerRadiiJson(),
            entity.getCouleur(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
