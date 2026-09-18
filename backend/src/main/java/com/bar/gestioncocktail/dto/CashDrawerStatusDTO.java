package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Data transfer object providing a real-time snapshot of the physical cash drawer status and liquidity.
 *
 * @param isOpened Whether an active cash drawer session is open for the operational day
 * @param session Current active drawer session details if open
 * @param openingFloat Declared starting cash float
 * @param totalCashRevenue Total cash revenue collected from settled orders
 * @param totalCashIn Total intra-day cash deposits
 * @param totalCashDrop Total cash skims transferred to safe
 * @param totalPaidOut Total petty cash expenses paid out
 * @param currentTheoreticalCash Instant expected theoretical cash balance in the drawer
 * @param movementsCount Total count of intra-day cash movements logged today
 */
@Schema(description = "Real-time status and theoretical liquidity of the cash drawer")
public record CashDrawerStatusDTO(
        boolean isOpened,
        CashDrawerSessionDTO session,
        BigDecimal openingFloat,
        BigDecimal totalCashRevenue,
        BigDecimal totalCashIn,
        BigDecimal totalCashDrop,
        BigDecimal totalPaidOut,
        BigDecimal currentTheoreticalCash,
        int movementsCount
) {
}
