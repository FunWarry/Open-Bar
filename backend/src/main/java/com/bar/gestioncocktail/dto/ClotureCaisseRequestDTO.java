package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

/**
 * Request payload for performing an end-of-day register closure (Z-Report).
 *
 * @param date Target date to close (defaults to current date if null)
 * @param openingFloat Opening cash drawer float amount (fond de caisse)
 * @param countedCash Total physically counted cash in the drawer
 * @param countingBreakdown Detailed coin and bill unit count breakdown
 * @param discrepancyReason Justification note if counted cash differs from theoretical cash
 */
public record ClotureCaisseRequestDTO(
        LocalDate date,
        @NotNull(message = "Opening float cannot be null")
        @PositiveOrZero(message = "Opening float must be zero or positive")
        BigDecimal openingFloat,

        @NotNull(message = "Counted cash cannot be null")
        @PositiveOrZero(message = "Counted cash must be zero or positive")
        BigDecimal countedCash,

        Map<String, Integer> countingBreakdown,
        String discrepancyReason
) {}
