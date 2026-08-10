package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ClosureType;
import com.bar.gestioncocktail.model.EstablishmentClosure;

import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * Record DTO presenting an establishment closure rule.
 */
public record EstablishmentClosureDTO(
        Long id,
        ClosureType type,
        DayOfWeek dayOfWeek,
        LocalDate closureDate,
        LocalDate endDate,
        Boolean isAnnualRecurring,
        String reason
) {
    public static EstablishmentClosureDTO from(EstablishmentClosure closure) {
        return new EstablishmentClosureDTO(
                closure.getId(),
                closure.getType(),
                closure.getDayOfWeek(),
                closure.getClosureDate(),
                closure.getEndDate(),
                closure.getIsAnnualRecurring(),
                closure.getReason()
        );
    }
}
