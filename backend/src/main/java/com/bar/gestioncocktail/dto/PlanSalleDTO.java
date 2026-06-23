package com.bar.gestioncocktail.dto;

public record PlanSalleDTO(
    Long tableId,
    Double planX,
    Double planY,
    Double planRotation,
    String planForme,
    String nom,
    Integer capacite,
    String zone,
    boolean occupee
) {
    public static PlanSalleDTO from(com.bar.gestioncocktail.model.TableEntity t) {
        return new PlanSalleDTO(
            t.getId(),
            t.getPlanX(),
            t.getPlanY(),
            t.getPlanRotation() != null ? t.getPlanRotation() : 0.0,
            t.getPlanForme() != null ? t.getPlanForme() : "CARRE",
            t.getNumero() != null ? t.getNumero().toString() : null,
            t.getCapacite(),
            t.getZone() != null ? t.getZone().name() : null,
            t.isOccupee()
        );
    }
}
