package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ClosureType;
import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * Record DTO for creating or updating establishment closure rules.
 */
public record EstablishmentClosureRequestDTO(
        ClosureType type,
        DayOfWeek dayOfWeek,
        LocalDate closureDate,
        LocalDate endDate,
        Boolean isAnnualRecurring,
        String reason
) {}
