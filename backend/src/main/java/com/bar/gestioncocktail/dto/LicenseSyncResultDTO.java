package com.bar.gestioncocktail.dto;

/**
 * Response DTO returned by manual or automatic online license synchronization.
 *
 * @param synced      True if a valid license update was fetched from the licensing server
 * @param reachable   True if the licensing server responded over the network
 * @param syncStatus  Sync outcome label (SUCCESS, OFFLINE, UP_TO_DATE, FAILED)
 * @param message     Human-readable diagnostic summary in English
 * @param license     Updated license status snapshot
 */
public record LicenseSyncResultDTO(
    boolean synced,
    boolean reachable,
    String syncStatus,
    String message,
    LicenseStatusDTO license
) {
}
