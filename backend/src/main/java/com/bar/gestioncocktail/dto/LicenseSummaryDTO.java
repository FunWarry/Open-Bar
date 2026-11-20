package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.LicenseStatus;

import java.time.Instant;

/**
 * Lightweight license status DTO exposed to all authenticated POS staff
 * to drive global grace-period / expiration warning banners and UI order-taking guards.
 *
 * @param status               Current operational license state
 * @param plan                 Active subscription plan tier
 * @param expiresAt            UTC subscription expiration timestamp
 * @param graceEndsAt          UTC end of the 2-day grace period
 * @param graceHoursRemaining  Remaining hours in the grace period
 * @param orderCreationAllowed Whether new orders can currently be placed
 * @param enforced             Whether strict license enforcement is active
 */
public record LicenseSummaryDTO(
    LicenseStatus status,
    String plan,
    Instant expiresAt,
    Instant graceEndsAt,
    long graceHoursRemaining,
    boolean orderCreationAllowed,
    boolean enforced
) {
}
