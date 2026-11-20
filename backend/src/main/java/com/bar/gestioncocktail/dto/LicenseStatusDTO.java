package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.LicenseStatus;

import java.time.Instant;
import java.util.List;

/**
 * Comprehensive administrative DTO describing the establishment's current license status,
 * cryptographic claims, grace-period countdown, module entitlements, and sync telemetry.
 *
 * @param status               Current operational license state
 * @param plan                 Active subscription plan tier
 * @param establishmentId      Establishment ID bound inside the license token
 * @param venueEstablishmentId Current venue establishment ID (SIRET) expected on this instance
 * @param issuedAt             UTC timestamp when the license was issued
 * @param expiresAt            UTC timestamp when the subscription expires
 * @param graceEndsAt          UTC timestamp when the 2-day grace period ends
 * @param daysRemaining        Remaining days before expiration (0 if expired)
 * @param graceHoursRemaining  Remaining hours in the 2-day grace period (0 if not in grace)
 * @param licensedModules      List of module names unlocked by the license
 * @param allModulesLicensed   True if all modules are unlocked (e.g. wildcard '*' or community mode)
 * @param orderCreationAllowed True if placing new orders is currently permitted
 * @param enforced             True if strict license enforcement is active on this environment
 * @param lastSyncAt           UTC timestamp of the last online license sync attempt
 * @param lastSyncStatus       Outcome of the last sync attempt (SUCCESS, OFFLINE, FAILED, NONE)
 * @param lastSyncError        Diagnostic summary from the last failed sync attempt
 * @param activationMode       Activation channel (ONLINE, OFFLINE, SEEDED, NONE)
 * @param activatedBy          Username that activated the license
 * @param publicKeyFingerprint SHA-256 fingerprint of the embedded verification public key
 * @param maskedToken          Redacted preview of the active JWT license token
 */
public record LicenseStatusDTO(
    LicenseStatus status,
    String plan,
    String establishmentId,
    String venueEstablishmentId,
    Instant issuedAt,
    Instant expiresAt,
    Instant graceEndsAt,
    long daysRemaining,
    long graceHoursRemaining,
    List<String> licensedModules,
    boolean allModulesLicensed,
    boolean orderCreationAllowed,
    boolean enforced,
    Instant lastSyncAt,
    String lastSyncStatus,
    String lastSyncError,
    String activationMode,
    String activatedBy,
    String publicKeyFingerprint,
    String maskedToken
) {
}
