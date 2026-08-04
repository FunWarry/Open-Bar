package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TypePoste;
import com.bar.gestioncocktail.model.TypeShift;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for creating or updating an employee shift.
 */
public record EmployeeShiftRequestDTO(
    Long userId,
    LocalDate dateShift,
    TypeShift typeShift,
    TypePoste typePoste,
    String heureDebut,
    String heureFin,
    BigDecimal heuresEffectuees,
    String notes
) {}
