package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

/**
 * Output DTO summarizing all active and past orders placed on a table
 * along with cumulative bill tracking until final invoice settlement.
 */
@Schema(description = "Summary of table orders, preparation status, and cumulative bill tracking")
public record TableOrdersSummaryResponseDTO(
        @Schema(description = "Table identifier", example = "9")
        Long tableId,

        @Schema(description = "Visible table number", example = "9")
        Integer tableNumero,

        @Schema(description = "List of all orders submitted during the current table session")
        List<PublicCommandeResponseDTO> orders,

        @Schema(description = "Cumulative total amount of all orders on the table bill", example = "45.50")
        BigDecimal cumulativeTotal,

        @Schema(description = "Total number of drinks ordered across all rounds", example = "5")
        int totalDrinksOrdered,

        @Schema(description = "Whether the table has active unpaid orders", example = "true")
        boolean hasUnpaidOrders,

        @Schema(description = "Whether a bill request (ADDITION) is currently active", example = "false")
        boolean billRequested
) {}
