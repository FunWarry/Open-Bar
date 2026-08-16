package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ZoneEntity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request Data Transfer Object for creating or updating a zone.
 *
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
 */
public record ZoneRequestDTO(
    @NotBlank(message = "Le nom de la zone est obligatoire")
    @Size(max = 50, message = "Le nom ne peut pas dépasser 50 caractères")
    String nom,
    String etage,
    Double planX,
    Double planY,
    Double planWidth,
    Double planHeight,
    String shapeType,
    String pointsJson,
    String cornerRadiiJson,
    String couleur
) {
    /**
     * Converts this request DTO to a JPA {@link ZoneEntity}.
     *
     * @return New ZoneEntity instance populated from this DTO
     */
    public ZoneEntity toEntity() {
        ZoneEntity entity = new ZoneEntity();
        entity.setNom(this.nom);
        entity.setEtage(this.etage != null ? this.etage : "RDC");
        entity.setPlanX(this.planX);
        entity.setPlanY(this.planY);
        entity.setPlanWidth(this.planWidth);
        entity.setPlanHeight(this.planHeight);
        entity.setShapeType(this.shapeType);
        entity.setPointsJson(this.pointsJson);
        entity.setCornerRadiiJson(this.cornerRadiiJson);
        entity.setCouleur(this.couleur);
        return entity;
    }
}
