package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Request payload for creating a new supplier purchase order.
 *
 * @param supplierId          Supplier unique identifier
 * @param dateLivraisonPrevue Estimated goods delivery date
 * @param notes               Special delivery instructions or order memo
 * @param items               List of ordered ingredient line items
 */
@Schema(description = "Payload for generating a supplier purchase order")
public record PurchaseOrderCreateRequest(
        @NotNull(message = "Supplier is required")
        Long supplierId,

        LocalDateTime dateLivraisonPrevue,

        String notes,

        @NotEmpty(message = "Order must contain at least one line item")
        @Valid
        List<PurchaseOrderItemRequest> items
) {}
