package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CommissionBillingRecord;
import com.bar.gestioncocktail.model.CommissionInvoiceStatus;
import com.bar.gestioncocktail.model.TpeMonetizationTier;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Full administrative dashboard payload for dual-tier TPE monetization, monthly commission totals,
 * billing sync telemetry, SHA-256 ledger integrity, and transaction audit history.
 *
 * @param billingPeriod         Selected billing period (YYYY-MM)
 * @param venueEstablishmentId  Establishment SIRET or fallback identifier
 * @param rates                 Effective dual-tier commission rate schedule
 * @param summary               Current grace-period and pending invoice status summary
 * @param option1Volume         Option 1 (Concert IP / Manual CB) gross card volume
 * @param option1Count          Option 1 card transaction count
 * @param option1Commission     Option 1 accumulated commission
 * @param option3Volume         Option 3 (Stripe Terminal Connect) gross card volume
 * @param option3Count          Option 3 card transaction count
 * @param option3Commission     Option 3 automatically deducted platform commission
 * @param totalCommissionDue    Total deferred Option 1 commission due for billing
 * @param lastSyncAt            UTC instant of last remote billing sync attempt
 * @param lastSyncStatus        Outcome of last remote billing sync
 * @param lastSyncError         Last sync diagnostic message if failed/offline
 * @param lastExportedAt        UTC instant of last offline Z-report proof export
 * @param integrity             SHA-256 ledger chain verification snapshot
 * @param entries               Ledger entries for the selected period
 * @param billingHistory        Historical monthly billing records
 */
public record MonetizationDashboardDTO(
        String billingPeriod,
        String venueEstablishmentId,
        CommissionTierRatesDTO rates,
        MonetizationSummaryDTO summary,
        BigDecimal option1Volume,
        long option1Count,
        BigDecimal option1Commission,
        BigDecimal option3Volume,
        long option3Count,
        BigDecimal option3Commission,
        BigDecimal totalCommissionDue,
        Instant lastSyncAt,
        String lastSyncStatus,
        String lastSyncError,
        Instant lastExportedAt,
        LedgerVerificationDTO integrity,
        List<CardCommissionLedgerEntryDTO> entries,
        List<BillingPeriodItemDTO> billingHistory
) {
    /**
     * Compact monthly billing history item.
     */
    public record BillingPeriodItemDTO(
            String billingPeriod,
            TpeMonetizationTier activeTier,
            BigDecimal option1Volume,
            long option1Count,
            BigDecimal option1Commission,
            BigDecimal option3Volume,
            long option3Count,
            BigDecimal option3Commission,
            BigDecimal totalCommissionDue,
            CommissionInvoiceStatus invoiceStatus,
            String remoteInvoiceId,
            BigDecimal pendingAmount,
            Instant graceEndsAt,
            Instant lastSyncAt,
            String lastSyncStatus,
            Instant lastExportedAt,
            Instant settledAt
    ) {
        /**
         * Maps a {@link CommissionBillingRecord} into a summary history item.
         *
         * @param r Source billing record
         * @return Immutable history item DTO
         */
        public static BillingPeriodItemDTO from(CommissionBillingRecord r) {
            return new BillingPeriodItemDTO(
                    r.getBillingPeriod(),
                    r.getActiveTier(),
                    r.getOption1Volume(),
                    r.getOption1Count() != null ? r.getOption1Count() : 0L,
                    r.getOption1Commission(),
                    r.getOption3Volume(),
                    r.getOption3Count() != null ? r.getOption3Count() : 0L,
                    r.getOption3Commission(),
                    r.getTotalCommissionDue(),
                    r.getInvoiceStatus(),
                    r.getRemoteInvoiceId(),
                    r.getPendingAmount(),
                    r.getGraceEndsAt(),
                    r.getLastSyncAt(),
                    r.getLastSyncStatus(),
                    r.getLastExportedAt(),
                    r.getSettledAt()
            );
        }
    }
}
