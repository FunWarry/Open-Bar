package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request payload for individual received quantities during a delivery check-in.
 *
 * @param itemId         Identifier of the purchase order line item being received
 * @param quantiteRecue  Actual quantity received from the delivery driver
 * @param prixUnitaireHt Optional adjusted unit purchase price if invoice differs from order
 */
@Schema(description = "Line item payload for delivery check-in intake")
public record PurchaseOrderReceptionItemRequest(
        @NotNull(message = "Item ID is required")
        Long itemId,

        @NotNull(message = "Received quantity is required")
        @DecimalMin(value = "0.0", message = "Received quantity cannot be negative")
        BigDecimal quantiteRecue,

        BigDecimal prixUnitaireHt
) {}
