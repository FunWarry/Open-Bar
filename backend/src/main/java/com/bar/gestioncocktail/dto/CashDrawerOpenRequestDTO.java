package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Request payload for opening the daily physical cash drawer register.
 *
 * @param openingFloat Declared total starting cash float
 * @param breakdown Optional per-denomination counted quantity map (e.g. {"50e": 2, "20e": 5})
 * @param notes Optional operator opening remarks
 */
@Schema(description = "Morning cash drawer opening declaration payload")
public record CashDrawerOpenRequestDTO(
        @NotNull(message = "Opening float cannot be null")
        @DecimalMin(value = "0.0", message = "Opening float must be greater than or equal to zero")
        BigDecimal openingFloat,

        Map<String, Integer> breakdown,

        String notes
) {
}
