package com.bar.gestioncocktail.service.monetization;

import com.bar.gestioncocktail.config.JwtProperties;
import com.bar.gestioncocktail.config.MonetizationProperties;
import com.bar.gestioncocktail.dto.LedgerVerificationDTO;
import com.bar.gestioncocktail.dto.MonetizationSummaryDTO;
import com.bar.gestioncocktail.dto.MonthlyCommissionProofDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.CardCommissionLedgerEntry;
import com.bar.gestioncocktail.model.CardCommissionSource;
import com.bar.gestioncocktail.model.CardCommissionStatus;
import com.bar.gestioncocktail.model.CommissionBillingRecord;
import com.bar.gestioncocktail.model.CommissionInvoiceStatus;
import com.bar.gestioncocktail.model.DailyCashClosure;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.TpeMonetizationTier;
import com.bar.gestioncocktail.repository.CardCommissionLedgerRepository;
import com.bar.gestioncocktail.repository.CommissionBillingRecordRepository;
import com.bar.gestioncocktail.repository.DailyCashClosureRepository;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import com.bar.gestioncocktail.service.LicenseService;
import com.bar.gestioncocktail.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CommissionLedgerService}.
 */
@ExtendWith(MockitoExtension.class)
class CommissionLedgerServiceTest {

    @Mock
    private CardCommissionLedgerRepository ledgerRepository;
    @Mock
    private CommissionBillingRecordRepository billingRepository;
    @Mock
    private DailyCashClosureRepository closureRepository;
    @Mock
    private LicenseService licenseService;
    @Mock
    private EstablishmentConfigService establishmentConfigService;
    @Mock
    private AppSettingsService appSettingsService;
    @Mock
    private NotificationService notificationService;

    private MonetizationProperties monetizationProperties;
    private CommissionCalculator calculator;
    private CommissionLedgerService service;
    private Clock fixedClock;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-11-15T18:00:00Z"), ZoneOffset.UTC);
        monetizationProperties = new MonetizationProperties();
        JwtProperties jwtProps = new JwtProperties();
        jwtProps.setSecret("test_openbar_default_secret_key_minimum_32_chars_long");

        lenient().when(licenseService.resolveVenueEstablishmentId()).thenReturn("73282932000074");
        lenient().when(licenseService.getActiveMonetizationClaims()).thenReturn(Optional.empty());
        lenient().when(establishmentConfigService.isModuleEnabled(EstablishmentModule.STRIPE_TERMINAL_CONNECT)).thenReturn(true);
        AppSettings settings = new AppSettings();
        lenient().when(appSettingsService.getSettings()).thenReturn(settings);

        calculator = new CommissionCalculator(monetizationProperties, licenseService, establishmentConfigService, appSettingsService);
        service = new CommissionLedgerService(
                ledgerRepository,
                billingRepository,
                closureRepository,
                calculator,
                monetizationProperties,
                licenseService,
                notificationService,
                jwtProps,
                new ObjectMapper().findAndRegisterModules(),
                fixedClock
        );
    }

    @Test
    @DisplayName("recordCardSettlement - chains SHA-256 hashes from genesis and computes Option 1 & Option 3 fees")
    void recordCardSettlement_chainsHashesCorrectly() {
        List<CardCommissionLedgerEntry> store = new ArrayList<>();
        when(ledgerRepository.findTopByOrderBySequenceNumberDesc()).thenAnswer(_ ->
                store.isEmpty() ? Optional.empty() : Optional.of(store.getLast()));
        when(ledgerRepository.findByBillingPeriodOrderBySequenceNumberAsc(any())).thenAnswer(_ -> List.copyOf(store));
        when(ledgerRepository.save(any())).thenAnswer(inv -> {
            CardCommissionLedgerEntry e = inv.getArgument(0);
            if (e.getId() == null) {
                e.setId((long) (store.size() + 1));
            }
            store.add(e);
            return e;
        });
        when(billingRepository.findByBillingPeriod(any())).thenReturn(Optional.empty());
        when(billingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CardCommissionLedgerEntry first = service.recordCardSettlement(
                new CommissionLedgerService.CardSettlementRecordCommand(
                        10L, null, "FAC-001", "tx-1", "AUTH-1", "01", "CB", "****1111",
                        CardCommissionSource.CONCERT_IP_TPE, new BigDecimal("50.00"), "EUR"
                ));

        CardCommissionLedgerEntry second = service.recordCardSettlement(
                new CommissionLedgerService.CardSettlementRecordCommand(
                        11L, null, "FAC-002", "pi_2", "pi_2", "ST-01", "VISA", "****2222",
                        CardCommissionSource.STRIPE_TERMINAL_CONNECT, new BigDecimal("100.00"), "EUR"
                ));

        assertEquals(1L, first.getSequenceNumber());
        assertEquals(CommissionLedgerService.GENESIS_HASH, first.getPreviousHash());
        assertEquals(new BigDecimal("0.70"), first.getCommissionAmount()); // 50 * 1.2% + 0.10 = 0.70
        assertEquals(CardCommissionStatus.ACCUMULATED, first.getStatus());

        assertEquals(2L, second.getSequenceNumber());
        assertEquals(first.getEntryHash(), second.getPreviousHash());
        assertEquals(new BigDecimal("0.50"), second.getCommissionAmount()); // 100 * 0.45% + 0.05 = 0.50
        assertEquals(CardCommissionStatus.SETTLED_AT_SOURCE, second.getStatus());

        when(ledgerRepository.findAllByOrderBySequenceNumberAsc()).thenReturn(store);
        LedgerVerificationDTO verification = service.verifyLedgerIntegrity();
        assertTrue(verification.valid());
        assertEquals(2L, verification.verifiedEntries());
        assertEquals(second.getEntryHash(), verification.tipHash());
    }

    @Test
    @DisplayName("verifyLedgerIntegrity - detects tampered grossAmount and flags broken sequence number")
    void verifyLedgerIntegrity_detectsTampering() {
        CardCommissionLedgerEntry entry = new CardCommissionLedgerEntry();
        entry.setSequenceNumber(1L);
        entry.setBillingPeriod("2026-11");
        entry.setEstablishmentId("73282932000074");
        entry.setTier(TpeMonetizationTier.CONCERT_IP_OFFLINE);
        entry.setSource(CardCommissionSource.CONCERT_IP_TPE);
        entry.setStatus(CardCommissionStatus.ACCUMULATED);
        entry.setGrossAmount(new BigDecimal("50.00"));
        entry.setRateBps(120);
        entry.setFixedFeeCents(10);
        entry.setCommissionAmount(new BigDecimal("0.70"));
        entry.setCurrency("EUR");
        entry.setRecordedAt(Instant.parse("2026-11-15T18:00:00Z"));
        entry.setPreviousHash(CommissionLedgerService.GENESIS_HASH);
        entry.setEntryHash(service.computeEntryHash(entry));

        // Tamper amount post-sealing
        entry.setGrossAmount(new BigDecimal("10.00"));
        when(ledgerRepository.findAllByOrderBySequenceNumberAsc()).thenReturn(List.of(entry));

        LedgerVerificationDTO result = service.verifyLedgerIntegrity();
        assertFalse(result.valid());
        assertEquals(1L, result.brokenSequenceNumber());
    }

    @Test
    @DisplayName("exportMonthlyProof - cross-references Z-reports, produces HMAC seal and marks entries EXPORTED_OFFLINE")
    void exportMonthlyProof_generatesSignedProof() {
        CardCommissionLedgerEntry entry = new CardCommissionLedgerEntry();
        entry.setId(1L);
        entry.setSequenceNumber(1L);
        entry.setBillingPeriod("2026-11");
        entry.setEstablishmentId("73282932000074");
        entry.setTier(TpeMonetizationTier.CONCERT_IP_OFFLINE);
        entry.setSource(CardCommissionSource.CONCERT_IP_TPE);
        entry.setStatus(CardCommissionStatus.ACCUMULATED);
        entry.setGrossAmount(new BigDecimal("100.00"));
        entry.setRateBps(120);
        entry.setFixedFeeCents(10);
        entry.setCommissionAmount(new BigDecimal("1.30"));
        entry.setCurrency("EUR");
        entry.setRecordedAt(Instant.parse("2026-11-15T18:00:00Z"));
        entry.setPreviousHash(CommissionLedgerService.GENESIS_HASH);
        entry.setEntryHash(service.computeEntryHash(entry));

        DailyCashClosure zReport = new DailyCashClosure();
        zReport.setClosureNumber("Z-2026-001");
        zReport.setClosureDate(LocalDate.of(2026, Month.NOVEMBER, 14));
        zReport.setTotalRevenueTTC(new BigDecimal("420.00"));
        zReport.setSha256Hash("zhash123456");

        when(ledgerRepository.findAllByOrderBySequenceNumberAsc()).thenReturn(List.of(entry));
        when(ledgerRepository.findByBillingPeriodOrderBySequenceNumberAsc("2026-11")).thenReturn(List.of(entry));
        when(closureRepository.findByClosureDateBetweenOrderByClosureDateAsc(
                LocalDate.of(2026, Month.NOVEMBER, 1), LocalDate.of(2026, Month.NOVEMBER, 30))).thenReturn(List.of(zReport));
        when(billingRepository.findByBillingPeriod("2026-11")).thenReturn(Optional.empty());
        when(billingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MonthlyCommissionProofDTO proof = service.exportMonthlyProof(YearMonth.of(2026, Month.NOVEMBER));

        assertEquals("2026-11", proof.billingPeriod());
        assertEquals(new BigDecimal("100.00"), proof.option1Volume());
        assertEquals(new BigDecimal("1.30"), proof.totalCommissionDue());
        assertTrue(proof.ledgerChainValid());
        assertEquals(1, proof.zReports().size());
        assertEquals("Z-2026-001", proof.zReports().getFirst().closureNumber());
        assertNotNull(proof.hmacSignature());
        assertNotNull(proof.compactProofToken());
        assertEquals(CardCommissionStatus.EXPORTED_OFFLINE, entry.getStatus());
        verify(ledgerRepository).saveAll(any());
    }

    @Test
    @DisplayName("assertTpeCardAllowed - blocks TPE when enforceGraceLock is true and invoice grace has expired")
    void assertTpeCardAllowed_blocksWhenOverdueAndEnforced() {
        monetizationProperties.setEnforceGraceLock(true);
        CommissionBillingRecord overdue = new CommissionBillingRecord();
        overdue.setBillingPeriod("2026-10");
        overdue.setRemoteInvoiceId("in_overdue_1");
        overdue.setInvoiceStatus(CommissionInvoiceStatus.GRACE_PERIOD);
        overdue.setPendingAmount(new BigDecimal("14.50"));
        overdue.setGraceEndsAt(Instant.parse("2026-11-10T00:00:00Z")); // past fixedClock 2026-11-15

        when(billingRepository.findByInvoiceStatusInOrderByBillingPeriodDesc(any()))
                .thenReturn(List.of(overdue));

        MonetizationSummaryDTO summary = service.getSummary();
        assertEquals(CommissionInvoiceStatus.OVERDUE, summary.invoiceStatus());
        assertTrue(summary.tpeCardLocked());
        assertTrue(summary.shouldShowBanner());
        assertThrows(BusinessException.class, () -> service.assertTpeCardAllowed());
    }

    @Test
    @DisplayName("recordCardSettlement - prevents duplicate entries with same externalTransactionId")
    void recordCardSettlement_idempotentByExternalTxId() {
        CardCommissionLedgerEntry existing = new CardCommissionLedgerEntry();
        existing.setId(99L);
        existing.setSequenceNumber(5L);
        when(ledgerRepository.findByExternalTransactionId("tx-dup")).thenReturn(Optional.of(existing));

        CardCommissionLedgerEntry res = service.recordCardSettlement(
                new CommissionLedgerService.CardSettlementRecordCommand(
                        1L, null, "FAC-1", "tx-dup", "AUTH-1", "01", "CB", "****",
                        CardCommissionSource.CONCERT_IP_TPE, new BigDecimal("25.00"), "EUR"
                ));

        assertEquals(99L, res.getId());
        verify(ledgerRepository, never()).save(any());
    }

    @Test
    @DisplayName("verifyLedgerIntegrity - returns genesis valid when empty and detects broken linkage")
    void verifyLedgerIntegrity_emptyAndLinkageMismatch() {
        when(ledgerRepository.findAllByOrderBySequenceNumberAsc()).thenReturn(List.of());
        LedgerVerificationDTO emptyReport = service.verifyLedgerIntegrity();
        assertTrue(emptyReport.valid());
        assertEquals(0L, emptyReport.totalEntries());

        CardCommissionLedgerEntry brokenLink = new CardCommissionLedgerEntry();
        brokenLink.setSequenceNumber(1L);
        brokenLink.setPreviousHash("bad-prev-hash");
        when(ledgerRepository.findAllByOrderBySequenceNumberAsc()).thenReturn(List.of(brokenLink));

        LedgerVerificationDTO mismatchReport = service.verifyLedgerIntegrity();
        assertFalse(mismatchReport.valid());
        assertEquals(1L, mismatchReport.brokenSequenceNumber());
    }

    @Test
    @DisplayName("getDashboard, updateBillingStatus, markRemoteInvoiceSettled/Failed, and JWT claims fallback")
    void dashboardBillingLifecycle_coversAllBranches() {
        CommissionBillingRecord existing = new CommissionBillingRecord();
        existing.setBillingPeriod("2026-11");
        existing.setRemoteInvoiceId("in_99");
        existing.setTotalCommissionDue(new BigDecimal("4.20"));

        when(billingRepository.findByBillingPeriod("2026-11")).thenReturn(Optional.of(existing));
        when(billingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerRepository.findByBillingPeriodOrderBySequenceNumberAsc("2026-11")).thenReturn(List.of());
        when(ledgerRepository.findAllByOrderBySequenceNumberAsc()).thenReturn(List.of());

        service.updateBillingStatus("2026-11", "in_99", CommissionInvoiceStatus.PENDING,
                new BigDecimal("4.20"), null, "SUCCESS", null);
        assertEquals(CommissionInvoiceStatus.PENDING, existing.getInvoiceStatus());
        assertNotNull(existing.getGraceEndsAt());

        when(billingRepository.findByRemoteInvoiceId("in_99")).thenReturn(Optional.of(existing));
        service.markRemoteInvoicePaymentFailed("in_99", null);
        assertEquals(CommissionInvoiceStatus.GRACE_PERIOD, existing.getInvoiceStatus());

        service.markRemoteInvoiceSettled("in_99");
        assertEquals(CommissionInvoiceStatus.SETTLED, existing.getInvoiceStatus());
        assertEquals(BigDecimal.ZERO.setScale(2), existing.getPendingAmount());

        when(billingRepository.findByRemoteInvoiceId("in_missing")).thenReturn(Optional.empty());
        service.markRemoteInvoicePaymentFailed("in_missing", new BigDecimal("7.50"));

        CardCommissionLedgerEntry opt1 = new CardCommissionLedgerEntry();
        opt1.setId(10L);
        opt1.setTier(TpeMonetizationTier.CONCERT_IP_OFFLINE);
        opt1.setStatus(CardCommissionStatus.ACCUMULATED);
        when(ledgerRepository.findAllById(List.of(10L))).thenReturn(List.of(opt1));
        assertEquals(1, service.markEntriesSyncedOnline(List.of(10L)));
        assertEquals(0, service.markEntriesSyncedOnline(List.of()));

        when(billingRepository.findByInvoiceStatusInOrderByBillingPeriodDesc(any())).thenReturn(List.of());
        when(licenseService.getActiveMonetizationClaims()).thenReturn(Optional.of(
                new com.bar.gestioncocktail.service.LicenseCryptoService.LicenseMonetizationClaims(
                        "CONCERT_IP_OFFLINE", 120, 10, 45, 5, "GRACE_PERIOD",
                        new BigDecimal("9.99"), "in_jwt_1", fixedClock.instant().plusSeconds(7200)
                )));

        MonetizationSummaryDTO jwtSummary = service.getSummary();
        assertEquals(CommissionInvoiceStatus.GRACE_PERIOD, jwtSummary.invoiceStatus());
        assertEquals("in_jwt_1", jwtSummary.remoteInvoiceId());
        assertTrue(jwtSummary.shouldShowBanner());

        assertNotNull(service.getDashboard(YearMonth.of(2026, Month.NOVEMBER)));

        assertThrows(BusinessException.class, () -> service.recordCardSettlement(
                new CommissionLedgerService.CardSettlementRecordCommand(
                        1L, null, "FAC-ERR", "tx-err", "A", "01", "CB", "****",
                        CardCommissionSource.CONCERT_IP_TPE, BigDecimal.ZERO, "EUR")));

        CardCommissionLedgerEntry tampered = new CardCommissionLedgerEntry();
        tampered.setSequenceNumber(1L);
        tampered.setPreviousHash(CommissionLedgerService.GENESIS_HASH);
        tampered.setEntryHash("tampered_digest_000");
        tampered.setTier(TpeMonetizationTier.CONCERT_IP_OFFLINE);
        tampered.setSource(CardCommissionSource.CONCERT_IP_TPE);
        tampered.setGrossAmount(new BigDecimal("10.00"));
        tampered.setCommissionAmount(new BigDecimal("0.22"));
        tampered.setCurrency("EUR");
        tampered.setRecordedAt(fixedClock.instant());
        when(ledgerRepository.findAllByOrderBySequenceNumberAsc()).thenReturn(List.of(tampered));

        LedgerVerificationDTO tamperReport = service.verifyLedgerIntegrity();
        assertFalse(tamperReport.valid());
        assertEquals(1L, tamperReport.brokenSequenceNumber());
    }
}
