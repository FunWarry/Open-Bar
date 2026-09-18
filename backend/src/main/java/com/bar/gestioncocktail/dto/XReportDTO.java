package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Data transfer object representing an intermediate X-Report (Rapport X).
 * Provides a non-destructive mid-shift financial snapshot of total sales, VAT breakdown,
 * payment method breakdown, starting float, cash movements, and expected drawer liquidity.
 *
 * @param reportDate Operational date
 * @param generatedAt Generation timestamp
 * @param generatedBy Username of the staff member requesting the report
 * @param session Current cash drawer session details
 * @param totalRevenueHT Total turnover excluding VAT
 * @param totalRevenueTTC Total turnover including VAT
 * @param ventilationModePaiement Summary per payment method (Cash, Card, etc.)
 * @param ventilationTva VAT rate distribution
 * @param openingFloat Starting cash float
 * @param totalCashRevenue Cash revenue received from orders
 * @param totalCashIn Total cash additions/deposits
 * @param totalCashDrop Total cash skims transferred to safe
 * @param totalPaidOut Total petty cash expenses paid out
 * @param theoreticalCashInDrawer Instant expected cash balance in drawer
 * @param movements Chronological list of intra-day cash movements
 */
@Schema(description = "Intermediate non-destructive X-Report financial snapshot")
public record XReportDTO(
        LocalDate reportDate,
        LocalDateTime generatedAt,
        String generatedBy,
        CashDrawerSessionDTO session,
        BigDecimal totalRevenueHT,
        BigDecimal totalRevenueTTC,
        List<PaymentModeSummaryDTO> ventilationModePaiement,
        List<VatSummaryDTO> ventilationTva,
        BigDecimal openingFloat,
        BigDecimal totalCashRevenue,
        BigDecimal totalCashIn,
        BigDecimal totalCashDrop,
        BigDecimal totalPaidOut,
        BigDecimal theoreticalCashInDrawer,
        List<CashMovementDTO> movements
) {
}
