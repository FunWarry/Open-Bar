package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CashMovementType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request payload for logging an intra-day physical cash drawer movement.
 *
 * @param type Movement classification (CASH_IN, CASH_DROP, PAID_OUT)
 * @param amount Positive monetary value of the movement
 * @param reason Mandatory business description or explanation
 * @param receiptReference Optional vendor invoice, receipt, or errand identifier
 */
@Schema(description = "Payload for logging an intra-day cash movement in the drawer")
public record CashMovementRequestDTO(
        @NotNull(message = "Movement type is mandatory")
        CashMovementType type,

        @NotNull(message = "Movement amount cannot be null")
        @DecimalMin(value = "0.01", message = "Movement amount must be greater than zero")
        BigDecimal amount,

        @NotBlank(message = "Reason is mandatory for any cash movement")
        String reason,

        String receiptReference
) {
}
