package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.config.LicenseProperties;
import com.bar.gestioncocktail.dto.LicenseStatusDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.LicenseExpiredException;
import com.bar.gestioncocktail.model.EstablishmentConfig;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.LicenseRecord;
import com.bar.gestioncocktail.model.LicenseStatus;
import com.bar.gestioncocktail.repository.EstablishmentConfigRepository;
import com.bar.gestioncocktail.repository.LicenseRecordRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link LicenseService} covering 2-day grace periods, order locks,
 * establishment binding, module entitlements, and clock rollback tamper detection.
 */
@ExtendWith(MockitoExtension.class)
class LicenseServiceTest {

    private static KeyPair ecKeyPair;
    private static String ecPublicKeyPem;
    private static final Instant FIXED_NOW = Instant.parse("2026-11-20T12:00:00Z");

    @Mock
    private LicenseRecordRepository licenseRecordRepository;
    @Mock
    private EstablishmentConfigRepository establishmentConfigRepository;
    @Mock
    private NotificationService notificationService;

    private LicenseProperties licenseProperties;
    private LicenseCryptoService cryptoService;
    private LicenseService licenseService;

    @BeforeAll
    static void setupKeys() throws Exception {
        KeyPairGenerator ecGen = KeyPairGenerator.getInstance("EC");
        ecGen.initialize(new ECGenParameterSpec("secp256r1"));
        ecKeyPair = ecGen.generateKeyPair();
        String base64 = Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.UTF_8))
                .encodeToString(ecKeyPair.getPublic().getEncoded());
        ecPublicKeyPem = "-----BEGIN PUBLIC KEY-----\n" + base64 + "\n-----END PUBLIC KEY-----";
    }

    @BeforeEach
    void setup() {
        licenseProperties = new LicenseProperties();
        licenseProperties.setPublicKeyPem(ecPublicKeyPem);
        licenseProperties.setEnforced(true);
        licenseProperties.setGracePeriodDays(2);

        ObjectMapper mapper = new ObjectMapper();
        cryptoService = new LicenseCryptoService(licenseProperties, mapper);
        licenseService = new LicenseService(
                licenseRecordRepository,
                establishmentConfigRepository,
                cryptoService,
                licenseProperties,
                notificationService,
                mapper,
                Clock.fixed(FIXED_NOW, ZoneOffset.UTC)
        );

        EstablishmentConfig config = new EstablishmentConfig();
        config.setSiret("73282932000074");
        when(establishmentConfigRepository.findById(EstablishmentConfig.SINGLETON_ID))
                .thenReturn(Optional.of(config));
    }

    private String signToken(String establishmentId, String plan, List<String> modules, Instant expiresAt) {
        return Jwts.builder()
                .subject(establishmentId)
                .claim("establishmentId", establishmentId)
                .claim("plan", plan)
                .claim("licensedModules", modules)
                .issuedAt(Date.from(FIXED_NOW.minus(10, ChronoUnit.DAYS)))
                .expiration(Date.from(expiresAt))
                .signWith(ecKeyPair.getPrivate(), Jwts.SIG.ES256)
                .compact();
    }

    @Test
    void getLicenseStatus_noTokenAndUnenforced_returnsCommunityMode() {
        licenseProperties.setEnforced(false);
        when(licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)).thenReturn(Optional.empty());

        LicenseStatusDTO status = licenseService.getLicenseStatus();

        assertThat(status.status()).isEqualTo(LicenseStatus.COMMUNITY);
        assertThat(status.orderCreationAllowed()).isTrue();
        assertThat(status.allModulesLicensed()).isTrue();
    }

    @Test
    void getLicenseStatus_noTokenAndEnforced_locksOrderCreation() {
        when(licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)).thenReturn(Optional.empty());

        LicenseStatusDTO status = licenseService.getLicenseStatus();

        assertThat(status.status()).isEqualTo(LicenseStatus.UNLICENSED);
        assertThat(status.orderCreationAllowed()).isFalse();
        assertThatThrownBy(() -> licenseService.assertOrderCreationAllowed())
                .isInstanceOf(LicenseExpiredException.class);
    }

    @Test
    void getLicenseStatus_expiredWithinTwoDayGrace_allowsOrderCreationWithWarning() {
        Instant expired18HoursAgo = FIXED_NOW.minus(18, ChronoUnit.HOURS);
        String token = signToken("73282932000074", "PRO", List.of("FLOOR_PLAN"), expired18HoursAgo);

        LicenseRecord stored = new LicenseRecord();
        stored.setLicenseToken(token);
        when(licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)).thenReturn(Optional.of(stored));

        LicenseStatusDTO status = licenseService.getLicenseStatus();

        assertThat(status.status()).isEqualTo(LicenseStatus.GRACE_PERIOD);
        assertThat(status.orderCreationAllowed()).isTrue();
        assertThat(status.graceHoursRemaining()).isEqualTo(30);
        assertThatCode(() -> licenseService.assertOrderCreationAllowed()).doesNotThrowAnyException();
    }

    @Test
    void getLicenseStatus_expiredBeyondTwoDays_locksOrderCreation() {
        Instant expired50HoursAgo = FIXED_NOW.minus(50, ChronoUnit.HOURS);
        String token = signToken("73282932000074", "PRO", List.of("FLOOR_PLAN"), expired50HoursAgo);

        LicenseRecord stored = new LicenseRecord();
        stored.setLicenseToken(token);
        when(licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)).thenReturn(Optional.of(stored));

        LicenseStatusDTO status = licenseService.getLicenseStatus();

        assertThat(status.status()).isEqualTo(LicenseStatus.EXPIRED);
        assertThat(status.orderCreationAllowed()).isFalse();
        assertThat(status.graceHoursRemaining()).isZero();
        assertThatThrownBy(() -> licenseService.assertOrderCreationAllowed())
                .isInstanceOf(LicenseExpiredException.class)
                .hasMessageContaining("2-day grace period have expired");
    }

    @Test
    void getLicenseStatus_clockRollbackTampering_usesHighWaterMark() {
        Instant expiredYesterday = FIXED_NOW.minus(1, ChronoUnit.DAYS);
        String token = signToken("73282932000074", "PRO", List.of("*"), expiredYesterday);

        LicenseRecord stored = new LicenseRecord();
        stored.setLicenseToken(token);
        // Simulate system previously observed 5 days after FIXED_NOW before clock rollback
        stored.setLastSeenAt(FIXED_NOW.plus(5, ChronoUnit.DAYS));
        when(licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)).thenReturn(Optional.of(stored));

        LicenseStatusDTO status = licenseService.getLicenseStatus();

        assertThat(status.status()).isEqualTo(LicenseStatus.EXPIRED);
        assertThat(status.orderCreationAllowed()).isFalse();
    }

    @Test
    void activateLicense_mismatchedEstablishmentId_throwsBusinessException() {
        String token = signToken("99999999999999", "PRO", List.of("*"), FIXED_NOW.plus(30, ChronoUnit.DAYS));

        assertThatThrownBy(() -> licenseService.activateLicense(token, "OFFLINE", "admin"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("does not match this venue");
    }

    @Test
    void activateLicense_validToken_persistsAndBroadcastsWebSocket() {
        String token = signToken("73282932000074", "PRO", List.of("FLOOR_PLAN", "HAPPY_HOUR"), FIXED_NOW.plus(30, ChronoUnit.DAYS));
        when(licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)).thenReturn(Optional.empty());
        when(licenseRecordRepository.save(any(LicenseRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        LicenseStatusDTO result = licenseService.activateLicense(token, "OFFLINE", "admin");

        assertThat(result.status()).isEqualTo(LicenseStatus.VALID);
        assertThat(result.plan()).isEqualTo("PRO");
        assertThat(result.daysRemaining()).isEqualTo(30);
        verify(notificationService).notifierLicenceMiseAJour(any());
    }

    @Test
    void isModuleLicensed_enforcesPlanModuleList() {
        String token = signToken("73282932000074", "ESSENTIAL", List.of("FLOOR_PLAN", "CASH_DRAWER"), FIXED_NOW.plus(10, ChronoUnit.DAYS));
        LicenseRecord stored = new LicenseRecord();
        stored.setLicenseToken(token);
        when(licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)).thenReturn(Optional.of(stored));

        assertThat(licenseService.isModuleLicensed(EstablishmentModule.FLOOR_PLAN)).isTrue();
        assertThat(licenseService.isModuleLicensed(EstablishmentModule.CUISINE_KDS)).isFalse();
        assertThat(licenseService.isModuleLicensed(null)).isTrue();
    }

    @Test
    void getLicenseSummaryAndStoredToken_andWildcardMatch_covered() {
        String token = signToken("*", "ENTERPRISE", List.of("*"), FIXED_NOW.plus(5, ChronoUnit.DAYS));
        LicenseRecord stored = new LicenseRecord();
        stored.setLicenseToken(token);
        when(licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)).thenReturn(Optional.of(stored));

        var summary = licenseService.getLicenseSummary();
        assertThat(summary.status()).isEqualTo(LicenseStatus.VALID);
        assertThat(summary.orderCreationAllowed()).isTrue();
        assertThat(licenseService.getStoredToken()).isEqualTo(token);
        assertThat(licenseService.isModuleLicensed(EstablishmentModule.CUISINE_KDS)).isTrue();
    }

    @Test
    void storedCorruptedToken_returnsInvalidAndBlocksOrders() {
        LicenseRecord stored = new LicenseRecord();
        stored.setLicenseToken("bad.jwt.token");
        stored.setPlan("PRO");
        when(licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)).thenReturn(Optional.of(stored));

        LicenseStatusDTO status = licenseService.getLicenseStatus();
        assertThat(status.status()).isEqualTo(LicenseStatus.INVALID);
        assertThat(status.orderCreationAllowed()).isFalse();
        assertThatThrownBy(() -> licenseService.assertOrderCreationAllowed())
                .isInstanceOf(LicenseExpiredException.class)
                .hasMessageContaining("failed verification");
    }

    @Test
    void deactivateRecordSyncAndTouchHighWaterMark_covered() {
        LicenseRecord stored = new LicenseRecord();
        stored.setLicenseToken("some.jwt.token");
        stored.setLastSeenAt(FIXED_NOW.minus(1, ChronoUnit.HOURS));
        when(licenseRecordRepository.findById(LicenseRecord.SINGLETON_ID)).thenReturn(Optional.of(stored));
        when(licenseRecordRepository.save(any(LicenseRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        licenseService.recordSyncAttempt("OFFLINE", "Network unreachable");
        licenseService.touchClockHighWaterMark();
        LicenseStatusDTO afterDeactivate = licenseService.deactivateLicense();

        assertThat(afterDeactivate.status()).isEqualTo(LicenseStatus.UNLICENSED);
        assertThat(afterDeactivate.activationMode()).isEqualTo("NONE");
        verify(notificationService).notifierLicenceMiseAJour(any());
    }
}
