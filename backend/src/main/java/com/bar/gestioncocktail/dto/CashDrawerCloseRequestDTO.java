package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

/**
 * Request payload for closing an active cash drawer register session with counted physical cash.
 *
 * @param countedCash Total physically counted cash in the drawer
 * @param denominationsJson Detailed coin and banknote denomination count breakdown in JSON format
 * @param notes Justification or observations (mandatory if cash variance is non-zero)
 */
@Schema(description = "Payload for closing an active cash drawer session and recording cash reconciliation")
public record CashDrawerCloseRequestDTO(
        @NotNull(message = "Counted cash amount cannot be null")
        @PositiveOrZero(message = "Counted cash amount must be zero or positive")
        BigDecimal countedCash,

        String denominationsJson,

        String notes
) {
}
