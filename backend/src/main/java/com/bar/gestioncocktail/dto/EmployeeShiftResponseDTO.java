package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.EmployeeShift;
import com.bar.gestioncocktail.model.TypePoste;
import com.bar.gestioncocktail.model.TypeShift;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for returning employee shift details.
 */
public record EmployeeShiftResponseDTO(
    Long id,
    Long userId,
    String userName,
    String userNom,
    String userPrenom,
    LocalDate dateShift,
    TypeShift typeShift,
    TypePoste typePoste,
    String heureDebut,
    String heureFin,
    String heurePauseDebut,
    Integer dureePauseMinutes,
    String heureDebutReelle,
    String heureFinReelle,
    BigDecimal heuresSup,
    BigDecimal heuresPrevues,
    BigDecimal heuresEffectuees,
    String notes,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static EmployeeShiftResponseDTO from(EmployeeShift shift) {
        if (shift == null) return null;
        return new EmployeeShiftResponseDTO(
            shift.getId(),
            shift.getUser() != null ? shift.getUser().getId() : null,
            shift.getUser() != null ? shift.getUser().getUsername() : null,
            shift.getUser() != null ? shift.getUser().getNom() : null,
            shift.getUser() != null ? shift.getUser().getPrenom() : null,
            shift.getDateShift(),
            shift.getTypeShift(),
            shift.getTypePoste(),
            shift.getHeureDebut(),
            shift.getHeureFin(),
            shift.getHeurePauseDebut(),
            shift.getDureePauseMinutes(),
            shift.getHeureDebutReelle(),
            shift.getHeureFinReelle(),
            shift.getHeuresSup(),
            shift.getHeuresPrevues(),
            shift.getHeuresEffectuees(),
            shift.getNotes(),
            shift.getCreatedAt(),
            shift.getUpdatedAt()
        );
    }
}
