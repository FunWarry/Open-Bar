package com.bar.gestioncocktail.dto;

/**
 * Cryptographic audit verification result of the SHA-256 hash-chained card commission ledger.
 *
 * @param valid                True if every entry's SHA-256 seal and chain linkage is intact
 * @param totalEntries         Total number of entries inspected
 * @param verifiedEntries      Count of consecutive valid entries from genesis
 * @param tipHash              Latest entry hash (or genesis zero hash if empty)
 * @param brokenSequenceNumber Sequence number of the first tampered entry if invalid, else null
 * @param message              Diagnostic summary
 */
public record LedgerVerificationDTO(
        boolean valid,
        long totalEntries,
        long verifiedEntries,
        String tipHash,
        Long brokenSequenceNumber,
        String message
) {
}
