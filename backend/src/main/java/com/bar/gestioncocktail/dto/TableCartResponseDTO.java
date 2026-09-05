package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Output DTO representing the consolidated state of a collaborative table cart.
 */
@Schema(description = "Consolidated collaborative table cart")
public record TableCartResponseDTO(
        @Schema(description = "Table identifier", example = "5")
        Long tableId,

        @Schema(description = "Cart state (OPEN, LOCKED, SUBMITTED)", example = "OPEN")
        String status,

        @Schema(description = "List of cart items aggregated across all guests at the table")
        List<TableCartItemResponseDTO> items,

        @Schema(description = "Total number of drinks in the cart", example = "4")
        int totalItems,

        @Schema(description = "Total price of all items in the cart", example = "38.00")
        BigDecimal totalPrice,

        @Schema(description = "ID of submitted order if already converted to an order", example = "105")
        Long submittedOrderId,

        @Schema(description = "Anonymous order tracking token if submitted", example = "c89efd01-6b45-4df3-8d07-a37aef567d89")
        String trackingToken,

        @Schema(description = "Name of guest who submitted the order", example = "Alex")
        String submittedBy,

        @Schema(description = "Last update timestamp")
        LocalDateTime updatedAt
) {
    /**
     * Creates an empty OPEN table cart.
     *
     * @param tableId Table identifier
     * @param now Current timestamp
     * @return Empty TableCartResponseDTO
     */
    public static TableCartResponseDTO empty(Long tableId, LocalDateTime now) {
        return new TableCartResponseDTO(
                tableId,
                "OPEN",
                List.of(),
                0,
                BigDecimal.ZERO,
                null,
                null,
                null,
                now
        );
    }
}
