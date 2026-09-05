package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TypePoste;
import com.bar.gestioncocktail.model.TypeShift;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for creating or updating an employee shift.
 */
public record EmployeeShiftRequestDTO(
    @NotNull(message = "userId is required")
    Long userId,

    @NotNull(message = "dateShift is required")
    LocalDate dateShift,

    @NotNull(message = "typeShift is required")
    TypeShift typeShift,

    @NotNull(message = "typePoste is required")
    TypePoste typePoste,

    @NotBlank(message = "heureDebut is required")
    String heureDebut,

    @NotBlank(message = "heureFin is required")
    String heureFin,

    String heurePauseDebut,

    Integer dureePauseMinutes,

    String heureDebutReelle,

    String heureFinReelle,

    BigDecimal heuresSup,

    BigDecimal heuresPrevues,

    BigDecimal heuresEffectuees,

    String notes
) {}
