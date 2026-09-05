package com.bar.gestioncocktail.dto;

public record PlanSalleDTO(
    Long tableId,
    Double planX,
    Double planY,
    Double planRotation,
    String planForme,
    Double planWidth,
    Double planHeight,
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
            t.getPlanWidth(),
            t.getPlanHeight(),
            t.getNumero() != null ? t.getNumero().toString() : null,
            t.getCapacite(),
            t.getZone(),
            t.isOccupee()
        );
    }
}
