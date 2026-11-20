package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.config.LicenseProperties;
import com.bar.gestioncocktail.dto.LicenseStatusDTO;
import com.bar.gestioncocktail.dto.LicenseSummaryDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.LicenseExpiredException;
import com.bar.gestioncocktail.model.EstablishmentConfig;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.LicensePlan;
import com.bar.gestioncocktail.model.LicenseRecord;
import com.bar.gestioncocktail.model.LicenseStatus;
import com.bar.gestioncocktail.repository.EstablishmentConfigRepository;
import com.bar.gestioncocktail.repository.LicenseRecordRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Core hybrid offline/online DRM licensing service.
 * <p>
 * Evaluates signed JWT licenses, enforces the 2-day post-expiration grace period,
 * protects against system clock rollback tampering, governs module entitlements,
 * and locks new order intake upon expiration while preserving read-only fiscal/audit access.
 */
@Service
public class LicenseService {

    private static final Logger log = LoggerFactory.getLogger(LicenseService.class);
    private static final String WILDCARD_ALL = "*";
    private static final String DEFAULT_VENUE_ID = "establishment-1";
    private static final Duration CLOCK_ROLLBACK_TOLERANCE = Duration.ofHours(1);

    private final LicenseRecordRepository licenseRecordRepository;
    private final EstablishmentConfigRepository establishmentConfigRepository;
    private final LicenseCryptoService licenseCryptoService;
    private final LicenseProperties licenseProperties;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    /**
     * Constructs LicenseService with Spring-managed dependencies and UTC clock.
     *
     * @param licenseRecordRepository       Repository for license persistence
     * @param establishmentConfigRepository Repository for venue SIRET / identity lookup
     * @param licenseCryptoService          Cryptographic JWT verifier
     * @param licenseProperties             Licensing configuration properties
     * @param notificationService           STOMP WebSocket broadcaster
     * @param objectMapper                  Jackson JSON mapper
     */
    @Autowired
    public LicenseService(
            LicenseRecordRepository licenseRecordRepository,
            EstablishmentConfigRepository establishmentConfigRepository,
            LicenseCryptoService licenseCryptoService,
            LicenseProperties licenseProperties,
            @Lazy NotificationService notificationService,
            ObjectMapper objectMapper) {
        this(
                licenseRecordRepository,
                establishmentConfigRepository,
                licenseCryptoService,
                licenseProperties,
                notificationService,
                objectMapper,
                Clock.systemUTC()
        );
    }

    /**
     * Constructs LicenseService with an explicit {@link Clock} for deterministic testing.
     *
     * @param licenseRecordRepository       Repository for license persistence
     * @param establishmentConfigRepository Repository for venue SIRET / identity lookup
     * @param licenseCryptoService          Cryptographic JWT verifier
     * @param licenseProperties             Licensing configuration properties
     * @param notificationService           STOMP WebSocket broadcaster
     * @param objectMapper                  Jackson JSON mapper
     * @param clock                         Clock source used for expiration & grace evaluation
     */
    public LicenseService(
            LicenseRecordRepository licenseRecordRepository,
            EstablishmentConfigRepository establishmentConfigRepository,
            LicenseCryptoService licenseCryptoService,
            LicenseProperties licenseProperties,
            NotificationService notificationService,
            ObjectMapper objectMapper,
            Clock clock) {
        this.licenseRecordRepository = licenseRecordRepository;
        this.establishmentConfigRepository = establishmentConfigRepository;
        this.licenseCryptoService = licenseCryptoService;
        this.licenseProperties = licenseProperties;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    /**
     * Retrieves the full administrative license status snapshot.
     *
     * @return Detailed {@link LicenseStatusDTO}
     */
    @Transactional(readOnly = true)
    public LicenseStatusDTO getLicenseStatus() {
        Optional<LicenseRecord> optEntity = licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID);
        String venueId = resolveVenueEstablishmentId();
        return evaluateLicenseStatus(optEntity.orElse(null), venueId);
    }

    /**
     * Retrieves the lightweight license summary suitable for authenticated staff banners and guards.
     *
     * @return {@link LicenseSummaryDTO}
     */
    @Transactional(readOnly = true)
    public LicenseSummaryDTO getLicenseSummary() {
        LicenseStatusDTO full = getLicenseStatus();
        return toSummary(full);
    }

    /**
     * Returns the raw stored JWT license token if present, or null.
     *
     * @return Stored JWT token or null
     */
    @Transactional(readOnly = true)
    public String getStoredToken() {
        return licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)
                .map(LicenseRecord::getLicenseToken)
                .orElse(null);
    }

    /**
     * Resolves the current establishment identifier expected in license tokens (venue SIRET or fallback ID).
     *
     * @return Venue establishment ID
     */
    @Transactional(readOnly = true)
    public String resolveVenueEstablishmentId() {
        return establishmentConfigRepository.findById(EstablishmentConfig.SINGLETON_ID)
                .map(EstablishmentConfig::getSiret)
                .filter(siret -> siret != null && !siret.isBlank())
                .orElse(DEFAULT_VENUE_ID);
    }

    /**
     * Verifies and persists a signed JWT license token activated either manually offline or via online sync.
     *
     * @param rawToken       Signed JWT license string
     * @param activationMode Activation channel ("OFFLINE", "ONLINE", "SEEDED")
     * @param actorUsername  Username triggering activation
     * @return Updated {@link LicenseStatusDTO}
     */
    @Transactional
    public LicenseStatusDTO activateLicense(String rawToken, String activationMode, String actorUsername) {
        LicenseCryptoService.ParsedLicenseClaims claims = licenseCryptoService.parseAndVerify(rawToken);
        String venueId = resolveVenueEstablishmentId();
        validateEstablishmentMatch(claims.establishmentId(), venueId);

        Instant now = clock.instant();
        LicenseRecord entity = getOrCreateEntity();
        entity.setLicenseToken(rawToken.trim());
        entity.setEstablishmentId(claims.establishmentId());
        entity.setPlan(claims.plan());
        entity.setLicensedModulesJson(serializeModules(claims.licensedModules()));
        entity.setIssuedAt(claims.issuedAt());
        entity.setExpiresAt(claims.expiresAt());
        entity.setActivationMode(activationMode != null ? activationMode : "OFFLINE");
        entity.setActivatedBy(actorUsername != null ? actorUsername : "system");
        updateHighWaterMark(entity, now);

        if ("ONLINE".equalsIgnoreCase(activationMode)) {
            entity.setLastSyncAt(now);
            entity.setLastSyncStatus("SUCCESS");
            entity.setLastSyncError(null);
        }

        LicenseRecord saved = licenseRecordRepository.save(entity);
        LicenseStatusDTO statusDto = evaluateLicenseStatus(saved, venueId);
        broadcastLicenseChange(statusDto);
        return statusDto;
    }

    /**
     * Clears the stored commercial license token, reverting to COMMUNITY or UNLICENSED state
     * while preserving the monotonic clock high-water mark.
     *
     * @return Updated {@link LicenseStatusDTO}
     */
    @Transactional
    public LicenseStatusDTO deactivateLicense() {
        LicenseRecord entity = getOrCreateEntity();
        entity.setLicenseToken(null);
        entity.setEstablishmentId(null);
        entity.setPlan(null);
        entity.setLicensedModulesJson(null);
        entity.setIssuedAt(null);
        entity.setExpiresAt(null);
        entity.setActivationMode("NONE");
        entity.setActivatedBy(null);
        updateHighWaterMark(entity, clock.instant());

        LicenseRecord saved = licenseRecordRepository.save(entity);
        LicenseStatusDTO statusDto = evaluateLicenseStatus(saved, resolveVenueEstablishmentId());
        broadcastLicenseChange(statusDto);
        return statusDto;
    }

    /**
     * Records online synchronization telemetry without overwriting an existing valid or grace-period token.
     *
     * @param syncStatus Outcome status ("SUCCESS", "UP_TO_DATE", "OFFLINE", "FAILED")
     * @param syncError  Optional error message
     */
    @Transactional
    public void recordSyncAttempt(String syncStatus, String syncError) {
        LicenseRecord entity = getOrCreateEntity();
        Instant now = clock.instant();
        entity.setLastSyncAt(now);
        entity.setLastSyncStatus(syncStatus);
        entity.setLastSyncError(truncate(syncError, 480));
        updateHighWaterMark(entity, now);
        licenseRecordRepository.save(entity);
    }

    /**
     * Updates the monotonic clock high-water mark stored on the license entity.
     */
    @Transactional
    public void touchClockHighWaterMark() {
        licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID).ifPresent(entity -> {
            Instant now = clock.instant();
            if (entity.getLastSeenAt() == null || now.isAfter(entity.getLastSeenAt())) {
                entity.setLastSeenAt(now);
                licenseRecordRepository.save(entity);
            }
        });
    }

    /**
     * Enforces order-taking eligibility before creating a new customer order.
     * Allows orders when valid, in community mode, or within the 2-day grace period;
     * throws {@link LicenseExpiredException} (HTTP 402) once expired beyond grace when enforcement is active.
     */
    @Transactional(readOnly = true)
    public void assertOrderCreationAllowed() {
        LicenseStatusDTO statusDto = getLicenseStatus();
        if (!statusDto.orderCreationAllowed()) {
            String message = switch (statusDto.status()) {
                case UNLICENSED -> "No active commercial license is installed. Please activate a license key in Admin License settings.";
                case INVALID -> "The installed license key failed verification. Please upload a valid license key.";
                default -> "OpenBar subscription and 2-day grace period have expired. New order creation is locked while historical invoices, Z-reports, and audit exports remain accessible.";
            };
            throw new LicenseExpiredException(message);
        }
    }

    /**
     * Checks whether a given {@link EstablishmentModule} is unlocked by the current license entitlements.
     *
     * @param module Capability module to verify
     * @return true if unlocked by active license or community mode
     */
    @Transactional(readOnly = true)
    public boolean isModuleLicensed(EstablishmentModule module) {
        if (module == null) {
            return true;
        }
        LicenseStatusDTO statusDto = getLicenseStatus();
        if (statusDto.allModulesLicensed()) {
            return true;
        }
        if (statusDto.status() == LicenseStatus.UNLICENSED || statusDto.status() == LicenseStatus.INVALID) {
            return !licenseProperties.isEnforced();
        }
        List<String> modules = statusDto.licensedModules();
        return modules != null && (modules.contains(WILDCARD_ALL)
                || modules.contains("ALL")
                || modules.contains(module.name()));
    }

    private LicenseStatusDTO evaluateLicenseStatus(LicenseRecord entity, String venueId) {
        String fingerprint = licenseCryptoService.getPublicKeyFingerprint();
        boolean enforced = licenseProperties.isEnforced();

        if (entity == null || entity.getLicenseToken() == null || entity.getLicenseToken().isBlank()) {
            LicenseStatus status = enforced ? LicenseStatus.UNLICENSED : LicenseStatus.COMMUNITY;
            return new LicenseStatusDTO(
                    status,
                    LicensePlan.COMMUNITY.name(),
                    venueId,
                    venueId,
                    null,
                    null,
                    null,
                    0,
                    0,
                    List.of(WILDCARD_ALL),
                    !enforced,
                    !enforced,
                    enforced,
                    entity != null ? entity.getLastSyncAt() : null,
                    entity != null ? entity.getLastSyncStatus() : "NONE",
                    entity != null ? entity.getLastSyncError() : null,
                    entity != null ? entity.getActivationMode() : "NONE",
                    entity != null ? entity.getActivatedBy() : null,
                    fingerprint,
                    null
            );
        }

        try {
            LicenseCryptoService.ParsedLicenseClaims claims = licenseCryptoService.parseAndVerify(entity.getLicenseToken());
            validateEstablishmentMatch(claims.establishmentId(), venueId);
            return buildEvaluatedTokenStatus(entity, claims, venueId, fingerprint, enforced);
        } catch (BusinessException ex) {
            log.warn("Stored license validation failed: {}", ex.getMessage());
            return new LicenseStatusDTO(
                    LicenseStatus.INVALID,
                    entity.getPlan(),
                    entity.getEstablishmentId(),
                    venueId,
                    entity.getIssuedAt(),
                    entity.getExpiresAt(),
                    null,
                    0,
                    0,
                    List.of(),
                    false,
                    !enforced,
                    enforced,
                    entity.getLastSyncAt(),
                    entity.getLastSyncStatus(),
                    ex.getMessage(),
                    entity.getActivationMode(),
                    entity.getActivatedBy(),
                    fingerprint,
                    maskToken(entity.getLicenseToken())
            );
        }
    }

    private LicenseStatusDTO buildEvaluatedTokenStatus(
            LicenseRecord entity,
            LicenseCryptoService.ParsedLicenseClaims claims,
            String venueId,
            String fingerprint,
            boolean enforced) {

        Instant effectiveNow = resolveEffectiveNow(entity, clock.instant());
        Instant expiresAt = claims.expiresAt();
        int graceDays = Math.max(0, licenseProperties.getGracePeriodDays());
        Instant graceEndsAt = expiresAt.plus(Duration.ofDays(graceDays));

        LicenseStatus status;
        long daysRemaining = 0;
        long graceHoursRemaining = 0;
        boolean orderCreationAllowed;

        if (!effectiveNow.isAfter(expiresAt)) {
            status = LicenseStatus.VALID;
            long remainingHours = Duration.between(effectiveNow, expiresAt).toHours();
            daysRemaining = Math.max(0, (remainingHours + 23) / 24);
            orderCreationAllowed = true;
        } else if (!effectiveNow.isAfter(graceEndsAt)) {
            status = LicenseStatus.GRACE_PERIOD;
            long remainingMinutes = Math.max(0, Duration.between(effectiveNow, graceEndsAt).toMinutes());
            graceHoursRemaining = remainingMinutes > 0 ? Math.max(1, (remainingMinutes + 59) / 60) : 0;
            orderCreationAllowed = true;
        } else {
            status = LicenseStatus.EXPIRED;
            orderCreationAllowed = !enforced;
        }

        List<String> modules = claims.licensedModules();
        boolean allModules = modules.contains(WILDCARD_ALL) || modules.contains("ALL");

        return new LicenseStatusDTO(
                status,
                claims.plan(),
                claims.establishmentId(),
                venueId,
                claims.issuedAt(),
                expiresAt,
                graceEndsAt,
                daysRemaining,
                graceHoursRemaining,
                modules,
                allModules,
                orderCreationAllowed,
                enforced,
                entity.getLastSyncAt(),
                entity.getLastSyncStatus(),
                entity.getLastSyncError(),
                entity.getActivationMode(),
                entity.getActivatedBy(),
                fingerprint,
                maskToken(entity.getLicenseToken())
        );
    }

    private Instant resolveEffectiveNow(LicenseRecord entity, Instant systemNow) {
        Instant lastSeen = entity.getLastSeenAt();
        if (lastSeen != null && lastSeen.isAfter(systemNow.plus(CLOCK_ROLLBACK_TOLERANCE))) {
            log.warn("System clock rollback detected (now={}, lastSeen={}); enforcing monotonic clock protection",
                    systemNow, lastSeen);
            return lastSeen;
        }
        if (lastSeen != null && lastSeen.isAfter(systemNow)) {
            return lastSeen;
        }
        return systemNow;
    }

    private void updateHighWaterMark(LicenseRecord entity, Instant now) {
        if (entity.getLastSeenAt() == null || now.isAfter(entity.getLastSeenAt())) {
            entity.setLastSeenAt(now);
        }
    }

    private void validateEstablishmentMatch(String tokenEstablishmentId, String venueEstablishmentId) {
        if (WILDCARD_ALL.equals(tokenEstablishmentId)) {
            return;
        }
        boolean matchesVenue = venueEstablishmentId.equalsIgnoreCase(tokenEstablishmentId)
                || DEFAULT_VENUE_ID.equalsIgnoreCase(tokenEstablishmentId);
        if (!matchesVenue) {
            throw new BusinessException(
                    "License token establishment ID '" + tokenEstablishmentId
                            + "' does not match this venue ('" + venueEstablishmentId + "')"
            );
        }
    }

    private LicenseRecord getOrCreateEntity() {
        return licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)
                .orElseGet(() -> {
                    LicenseRecord created = new LicenseRecord();
                    created.setId(LicenseRecord.SINGLETON_ID);
                    return created;
                });
    }

    private String serializeModules(List<String> modules) {
        try {
            return objectMapper.writeValueAsString(modules);
        } catch (Exception _) {
            return "[\"*\"]";
        }
    }

    private String maskToken(String token) {
        if (token == null || token.length() < 24) {
            return "***";
        }
        return token.substring(0, 12) + "..." + token.substring(token.length() - 10);
    }

    private String truncate(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLen ? value : value.substring(0, maxLen);
    }

    private void broadcastLicenseChange(LicenseStatusDTO statusDto) {
        if (notificationService != null) {
            notificationService.notifierLicenceMiseAJour(toSummary(statusDto));
        }
    }

    private LicenseSummaryDTO toSummary(LicenseStatusDTO full) {
        return new LicenseSummaryDTO(
                full.status(),
                full.plan(),
                full.expiresAt(),
                full.graceEndsAt(),
                full.graceHoursRemaining(),
                full.orderCreationAllowed(),
                full.enforced()
        );
    }
}
