package com.bar.gestioncocktail.dto;

/**
 * Outcome of an online commission ledger synchronization with the central Stripe Billing service.
 *
 * @param synced            True if new ledger volumes or invoice updates were synchronized
 * @param onlineReachable   True if the central billing endpoint was reachable
 * @param syncStatus        Outcome status ("SUCCESS", "UP_TO_DATE", "OFFLINE", "FAILED")
 * @param syncedEntriesCount Number of Option 1 entries marked as synced
 * @param message           Human-readable status description
 * @param summary           Updated monetization billing summary
 */
public record CommissionSyncResultDTO(
        boolean synced,
        boolean onlineReachable,
        String syncStatus,
        int syncedEntriesCount,
        String message,
        MonetizationSummaryDTO summary
) {
}
