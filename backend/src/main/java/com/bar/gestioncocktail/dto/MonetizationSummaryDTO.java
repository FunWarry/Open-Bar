package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CommissionInvoiceStatus;
import com.bar.gestioncocktail.model.TpeMonetizationTier;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Lightweight commission billing and grace-period status summary exposed to POS staff and settings banners.
 *
 * @param activeTier          Active TPE monetization tier
 * @param billingPeriod       Current or relevant pending billing period (YYYY-MM)
 * @param invoiceStatus       Pending invoice / grace status
 * @param remoteInvoiceId     Remote Stripe Billing invoice reference if present
 * @param pendingAmount       Outstanding commission balance awaiting payment
 * @param graceEndsAt         UTC deadline of the grace period
 * @param graceHoursRemaining Remaining hours before grace period expires (0 if not in grace)
 * @param enforceGraceLock    Whether expired commission grace locks new TPE card transactions
 * @param tpeCardLocked       True when new TPE card transactions are blocked due to overdue commission
 * @param shouldShowBanner    True when a pending, grace-period, or overdue commission warning banner should be shown
 */
public record MonetizationSummaryDTO(
        TpeMonetizationTier activeTier,
        String billingPeriod,
        CommissionInvoiceStatus invoiceStatus,
        String remoteInvoiceId,
        BigDecimal pendingAmount,
        Instant graceEndsAt,
        long graceHoursRemaining,
        boolean enforceGraceLock,
        boolean tpeCardLocked,
        boolean shouldShowBanner
) {
}
