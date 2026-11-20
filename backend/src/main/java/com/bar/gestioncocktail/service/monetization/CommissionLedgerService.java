package com.bar.gestioncocktail.service.monetization;

import com.bar.gestioncocktail.config.JwtProperties;
import com.bar.gestioncocktail.config.MonetizationProperties;
import com.bar.gestioncocktail.dto.CardCommissionLedgerEntryDTO;
import com.bar.gestioncocktail.dto.CommissionTierRatesDTO;
import com.bar.gestioncocktail.dto.LedgerVerificationDTO;
import com.bar.gestioncocktail.dto.MonetizationDashboardDTO;
import com.bar.gestioncocktail.dto.MonetizationSummaryDTO;
import com.bar.gestioncocktail.dto.MonthlyCommissionProofDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.CardCommissionLedgerEntry;
import com.bar.gestioncocktail.model.CardCommissionSource;
import com.bar.gestioncocktail.model.CardCommissionStatus;
import com.bar.gestioncocktail.model.CommissionBillingRecord;
import com.bar.gestioncocktail.model.CommissionInvoiceStatus;
import com.bar.gestioncocktail.model.DailyCashClosure;
import com.bar.gestioncocktail.model.TpeMonetizationTier;
import com.bar.gestioncocktail.repository.CardCommissionLedgerRepository;
import com.bar.gestioncocktail.repository.CommissionBillingRecordRepository;
import com.bar.gestioncocktail.repository.DailyCashClosureRepository;
import com.bar.gestioncocktail.service.LicenseCryptoService;
import com.bar.gestioncocktail.service.LicenseService;
import com.bar.gestioncocktail.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Core NF525-aligned cryptographic commission ledger service.
 * <p>
 * Seals card payment volumes into a SHA-256 hash-chained ledger, maintains monthly
 * billing period totals, generates signed offline Z-report export proof bundles for
 * openbar.fr portal renewal, and enforces commission grace-period warnings.
 */
@Service
public class CommissionLedgerService {

    private static final Logger log = LoggerFactory.getLogger(CommissionLedgerService.class);
    public static final String GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

    private final CardCommissionLedgerRepository ledgerRepository;
    private final CommissionBillingRecordRepository billingRepository;
    private final DailyCashClosureRepository closureRepository;
    private final CommissionCalculator commissionCalculator;
    private final MonetizationProperties monetizationProperties;
    private final LicenseService licenseService;
    private final NotificationService notificationService;
    private final JwtProperties jwtProperties;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    /**
     * Constructs CommissionLedgerService with Spring-managed dependencies and UTC clock.
     */
    @Autowired
    public CommissionLedgerService(
            CardCommissionLedgerRepository ledgerRepository,
            CommissionBillingRecordRepository billingRepository,
            DailyCashClosureRepository closureRepository,
            CommissionCalculator commissionCalculator,
            MonetizationProperties monetizationProperties,
            LicenseService licenseService,
            @Lazy NotificationService notificationService,
            JwtProperties jwtProperties,
            ObjectMapper objectMapper) {
        this(ledgerRepository, billingRepository, closureRepository, commissionCalculator,
                monetizationProperties, licenseService, notificationService, jwtProperties,
                objectMapper, Clock.systemUTC());
    }

    /**
     * Constructs CommissionLedgerService with an explicit {@link Clock} for deterministic unit testing.
     */
    public CommissionLedgerService(
            CardCommissionLedgerRepository ledgerRepository,
            CommissionBillingRecordRepository billingRepository,
            DailyCashClosureRepository closureRepository,
            CommissionCalculator commissionCalculator,
            MonetizationProperties monetizationProperties,
            LicenseService licenseService,
            NotificationService notificationService,
            JwtProperties jwtProperties,
            ObjectMapper objectMapper,
            Clock clock) {
        this.ledgerRepository = ledgerRepository;
        this.billingRepository = billingRepository;
        this.closureRepository = closureRepository;
        this.commissionCalculator = commissionCalculator;
        this.monetizationProperties = monetizationProperties;
        this.licenseService = licenseService;
        this.notificationService = notificationService;
        this.jwtProperties = jwtProperties;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    /**
     * Records a card payment settlement into the SHA-256 hash-chained commission ledger if not already recorded.
     *
     * @param cmd Card settlement descriptor
     * @return Persisted {@link CardCommissionLedgerEntry} or existing duplicate-guarded entry
     */
    @Transactional
    public CardCommissionLedgerEntry recordCardSettlement(CardSettlementRecordCommand cmd) {
        if (cmd == null || cmd.grossAmount() == null || cmd.grossAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Card settlement gross amount must be positive");
        }
        Optional<CardCommissionLedgerEntry> existing = findExistingEntry(cmd);
        if (existing.isPresent()) {
            return existing.get();
        }

        TpeMonetizationTier tier = cmd.source() == CardCommissionSource.STRIPE_TERMINAL_CONNECT
                ? TpeMonetizationTier.STRIPE_TERMINAL_CONNECT
                : TpeMonetizationTier.CONCERT_IP_OFFLINE;
        CardCommissionStatus initialStatus = tier == TpeMonetizationTier.STRIPE_TERMINAL_CONNECT
                ? CardCommissionStatus.SETTLED_AT_SOURCE
                : CardCommissionStatus.ACCUMULATED;

        CommissionCalculator.CommissionCalculation calc = commissionCalculator.calculateForTier(cmd.grossAmount(), tier);
        Instant now = clock.instant().truncatedTo(ChronoUnit.MILLIS);
        String billingPeriod = YearMonth.from(now.atZone(ZoneId.systemDefault())).toString();
        String establishmentId = resolveEstablishmentId();

        Optional<CardCommissionLedgerEntry> latestOpt = ledgerRepository.findTopByOrderBySequenceNumberDesc();
        long nextSeq = latestOpt.map(e -> e.getSequenceNumber() + 1L).orElse(1L);
        String prevHash = latestOpt.map(CardCommissionLedgerEntry::getEntryHash).orElse(GENESIS_HASH);

        CardCommissionLedgerEntry entry = new CardCommissionLedgerEntry();
        entry.setSequenceNumber(nextSeq);
        entry.setBillingPeriod(billingPeriod);
        entry.setEstablishmentId(establishmentId);
        entry.setFactureId(cmd.factureId());
        entry.setReglementId(cmd.reglementId());
        entry.setInvoiceNumber(cmd.invoiceNumber());
        entry.setExternalTransactionId(cmd.externalTransactionId());
        entry.setTpeAuthorizationCode(cmd.tpeAuthorizationCode());
        entry.setTpeTerminalId(cmd.tpeTerminalId());
        entry.setCardBrand(cmd.cardBrand());
        entry.setMaskedPan(cmd.maskedPan());
        entry.setTier(tier);
        entry.setSource(cmd.source());
        entry.setStatus(initialStatus);
        entry.setGrossAmount(cmd.grossAmount().setScale(2, RoundingMode.HALF_UP));
        entry.setRateBps(calc.rateBps());
        entry.setFixedFeeCents(calc.fixedFeeCents());
        entry.setCommissionAmount(calc.commission());
        entry.setCurrency(normalizeCurrency(cmd.currency()));
        entry.setPreviousHash(prevHash);
        entry.setRecordedAt(now);
        if (initialStatus == CardCommissionStatus.SETTLED_AT_SOURCE) {
            entry.setSyncedAt(now);
        }
        entry.setEntryHash(computeEntryHash(entry));

        CardCommissionLedgerEntry saved = ledgerRepository.save(entry);
        recalculateBillingPeriod(billingPeriod, establishmentId);
        broadcastSummary();
        return saved;
    }

    /**
     * Verifies cryptographic SHA-256 chain continuity across every entry in the local ledger.
     *
     * @return Verification report indicating whether any entry was altered or deleted
     */
    @Transactional(readOnly = true)
    public LedgerVerificationDTO verifyLedgerIntegrity() {
        List<CardCommissionLedgerEntry> entries = ledgerRepository.findAllByOrderBySequenceNumberAsc();
        if (entries.isEmpty()) {
            return new LedgerVerificationDTO(true, 0L, 0L, GENESIS_HASH, null,
                    "Commission ledger is empty and intact at genesis.");
        }

        String expectedPrev = GENESIS_HASH;
        long verified = 0L;
        for (CardCommissionLedgerEntry entry : entries) {
            if (!expectedPrev.equals(entry.getPreviousHash())) {
                return new LedgerVerificationDTO(false, entries.size(), verified, expectedPrev,
                        entry.getSequenceNumber(),
                        "Chain linkage mismatch at sequence #" + entry.getSequenceNumber());
            }
            String expectedHash = computeEntryHash(entry);
            if (!expectedHash.equals(entry.getEntryHash())) {
                return new LedgerVerificationDTO(false, entries.size(), verified, expectedPrev,
                        entry.getSequenceNumber(),
                        "SHA-256 payload seal mismatch at sequence #" + entry.getSequenceNumber());
            }
            expectedPrev = entry.getEntryHash();
            verified++;
        }

        return new LedgerVerificationDTO(true, entries.size(), verified, expectedPrev, null,
                "All " + verified + " card commission ledger entries verified intact.");
    }

    /**
     * Generates a cryptographically signed offline monthly Z-report proof bundle for upload to openbar.fr.
     *
     * @param period Target billing month (defaults to current month if null)
     * @return Signed {@link MonthlyCommissionProofDTO}
     */
    @Transactional
    public MonthlyCommissionProofDTO exportMonthlyProof(YearMonth period) {
        YearMonth targetPeriod = period != null ? period : YearMonth.now(clock.withZone(ZoneId.systemDefault()));
        String periodStr = targetPeriod.toString();
        String establishmentId = resolveEstablishmentId();

        LedgerVerificationDTO integrity = verifyLedgerIntegrity();
        List<CardCommissionLedgerEntry> periodEntries =
                ledgerRepository.findByBillingPeriodOrderBySequenceNumberAsc(periodStr);

        PeriodTotals totals = computePeriodTotals(periodEntries);
        String startHash = periodEntries.isEmpty() ? GENESIS_HASH : periodEntries.getFirst().getPreviousHash();
        String endHash = periodEntries.isEmpty() ? integrity.tipHash() : periodEntries.getLast().getEntryHash();

        List<DailyCashClosure> closures = closureRepository.findByClosureDateBetweenOrderByClosureDateAsc(
                targetPeriod.atDay(1), targetPeriod.atEndOfMonth());
        List<MonthlyCommissionProofDTO.ZReportDigestDTO> zReports = closures.stream()
                .map(c -> new MonthlyCommissionProofDTO.ZReportDigestDTO(
                        c.getClosureNumber(),
                        c.getClosureDate(),
                        c.getTotalRevenueTTC(),
                        c.getSha256Hash()))
                .toList();

        Instant now = clock.instant().truncatedTo(ChronoUnit.MILLIS);
        String canonicalPayload = buildCanonicalProofPayload(
                periodStr, establishmentId, now, totals, startHash, endHash, integrity.valid(), zReports);
        String payloadDigest = sha256Hex(canonicalPayload);
        String hmacSig = computeHmacSha256Hex(canonicalPayload, establishmentId);

        markOfflineExported(periodEntries);

        CommissionBillingRecord billing = getOrCreateBillingRecord(periodStr, establishmentId);
        applyTotalsToBillingRecord(billing, totals);
        billing.setLastExportedAt(now);
        billing.setLastExportHash(payloadDigest);
        billing.setEndLedgerHash(endHash);
        billing.setZReportRefsJson(serializeSafe(zReports));
        billingRepository.save(billing);

        String compactToken = encodeCompactProofToken(periodStr, establishmentId, payloadDigest, hmacSig, totals, endHash);

        return new MonthlyCommissionProofDTO(
                periodStr,
                establishmentId,
                now,
                totals.opt1Vol(),
                totals.opt1Count(),
                totals.opt1Comm(),
                totals.opt3Vol(),
                totals.opt3Count(),
                totals.opt3Comm(),
                totals.opt1Comm(),
                startHash,
                endHash,
                integrity.valid(),
                zReports,
                payloadDigest,
                hmacSig,
                compactToken
        );
    }

    /**
     * Retrieves lightweight monetization and commission grace-period status for staff banners & POS guards.
     *
     * @return {@link MonetizationSummaryDTO}
     */
    @Transactional(readOnly = true)
    public MonetizationSummaryDTO getSummary() {
        CommissionTierRatesDTO rates = commissionCalculator.resolveEffectiveRates();
        Instant now = clock.instant().truncatedTo(ChronoUnit.MILLIS);

        Optional<CommissionBillingRecord> pendingRecord = billingRepository
                .findByInvoiceStatusInOrderByBillingPeriodDesc(List.of(
                        CommissionInvoiceStatus.OVERDUE,
                        CommissionInvoiceStatus.GRACE_PERIOD,
                        CommissionInvoiceStatus.PENDING))
                .stream()
                .findFirst();

        if (pendingRecord.isPresent()) {
            return buildSummaryFromRecord(rates.activeTier(), pendingRecord.get(), now);
        }

        Optional<LicenseCryptoService.LicenseMonetizationClaims> jwtClaims =
                licenseService != null ? licenseService.getActiveMonetizationClaims() : Optional.empty();
        if (jwtClaims.isPresent() && isPendingClaimStatus(jwtClaims.get().commissionStatus())) {
            return buildSummaryFromJwtClaims(rates.activeTier(), jwtClaims.get(), now);
        }

        return new MonetizationSummaryDTO(
                rates.activeTier(),
                YearMonth.now(clock.withZone(ZoneId.systemDefault())).toString(),
                CommissionInvoiceStatus.NONE,
                null,
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                null,
                0L,
                monetizationProperties.isEnforceGraceLock(),
                false,
                false
        );
    }

    /**
     * Enforces optional commission grace-period lock before initiating new POS TPE card payments.
     */
    @Transactional(readOnly = true)
    public void assertTpeCardAllowed() {
        MonetizationSummaryDTO summary = getSummary();
        if (summary.tpeCardLocked()) {
            throw new BusinessException(
                    "Card terminal operations are temporarily locked because commission invoice "
                            + (summary.remoteInvoiceId() != null ? summary.remoteInvoiceId() : summary.billingPeriod())
                            + " is overdue past its grace deadline. Please settle or sync in Admin License & Monetization settings.");
        }
    }

    /**
     * Retrieves the complete administrative monetization dashboard for a target YYYY-MM period.
     *
     * @param period Target month (defaults to current month)
     * @return Full {@link MonetizationDashboardDTO}
     */
    @Transactional(readOnly = true)
    public MonetizationDashboardDTO getDashboard(YearMonth period) {
        YearMonth target = period != null ? period : YearMonth.now(clock.withZone(ZoneId.systemDefault()));
        String periodStr = target.toString();
        String venueId = resolveEstablishmentId();

        CommissionTierRatesDTO rates = commissionCalculator.resolveEffectiveRates();
        MonetizationSummaryDTO summary = getSummary();
        LedgerVerificationDTO integrity = verifyLedgerIntegrity();

        List<CardCommissionLedgerEntry> periodEntries =
                ledgerRepository.findByBillingPeriodOrderBySequenceNumberAsc(periodStr);
        PeriodTotals totals = computePeriodTotals(periodEntries);

        Optional<CommissionBillingRecord> recordOpt = billingRepository.findByBillingPeriod(periodStr);
        List<CardCommissionLedgerEntryDTO> entryDtos = periodEntries.stream()
                .map(CardCommissionLedgerEntryDTO::from)
                .toList();
        List<MonetizationDashboardDTO.BillingPeriodItemDTO> history = billingRepository
                .findAllByOrderByBillingPeriodDesc().stream()
                .map(MonetizationDashboardDTO.BillingPeriodItemDTO::from)
                .toList();

        return new MonetizationDashboardDTO(
                periodStr,
                venueId,
                rates,
                summary,
                totals.opt1Vol(),
                totals.opt1Count(),
                totals.opt1Comm(),
                totals.opt3Vol(),
                totals.opt3Count(),
                totals.opt3Comm(),
                totals.opt1Comm(),
                recordOpt.map(CommissionBillingRecord::getLastSyncAt).orElse(null),
                recordOpt.map(CommissionBillingRecord::getLastSyncStatus).orElse("NONE"),
                recordOpt.map(CommissionBillingRecord::getLastSyncError).orElse(null),
                recordOpt.map(CommissionBillingRecord::getLastExportedAt).orElse(null),
                integrity,
                entryDtos,
                history
        );
    }

    /**
     * Updates a billing period's invoice and grace status from online sync or Stripe Billing webhook events.
     *
     * @param billingPeriod   Target YYYY-MM period
     * @param remoteInvoiceId External Stripe invoice identifier
     * @param status          New invoice status
     * @param pendingAmount   Pending commission amount
     * @param graceEndsAt     Grace deadline if pending/grace
     * @param syncStatus      Sync telemetry status
     * @param syncError       Optional error detail
     */
    @Transactional
    public void updateBillingStatus(
            String billingPeriod,
            String remoteInvoiceId,
            CommissionInvoiceStatus status,
            BigDecimal pendingAmount,
            Instant graceEndsAt,
            String syncStatus,
            String syncError) {
        String targetPeriod = (billingPeriod != null && !billingPeriod.isBlank())
                ? billingPeriod
                : YearMonth.now(clock.withZone(ZoneId.systemDefault())).toString();
        String estId = resolveEstablishmentId();
        CommissionBillingRecord record = getOrCreateBillingRecord(targetPeriod, estId);

        if (remoteInvoiceId != null && !remoteInvoiceId.isBlank()) {
            record.setRemoteInvoiceId(remoteInvoiceId);
        }
        if (status != null) {
            record.setInvoiceStatus(status);
            if (status == CommissionInvoiceStatus.SETTLED) {
                record.setPendingAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                record.setSettledAt(clock.instant());
                record.setGraceStartedAt(null);
                record.setGraceEndsAt(null);
            } else if (status == CommissionInvoiceStatus.GRACE_PERIOD || status == CommissionInvoiceStatus.PENDING) {
                if (record.getGraceStartedAt() == null) {
                    record.setGraceStartedAt(clock.instant());
                }
                Instant resolvedGrace = graceEndsAt != null
                        ? graceEndsAt
                        : clock.instant().plus(Duration.ofDays(monetizationProperties.getGracePeriodDays()));
                record.setGraceEndsAt(resolvedGrace);
            }
        }
        if (pendingAmount != null && status != CommissionInvoiceStatus.SETTLED) {
            record.setPendingAmount(pendingAmount.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
        }
        if (syncStatus != null) {
            record.setLastSyncAt(clock.instant());
            record.setLastSyncStatus(syncStatus);
            record.setLastSyncError(syncError != null && syncError.length() > 480 ? syncError.substring(0, 480) : syncError);
        }
        billingRepository.save(record);
        broadcastSummary();
    }

    /**
     * Marks a billing period as settled by matching its remote Stripe Billing invoice ID.
     *
     * @param remoteInvoiceId External Stripe invoice identifier
     */
    @Transactional
    public void markRemoteInvoiceSettled(String remoteInvoiceId) {
        if (remoteInvoiceId == null || remoteInvoiceId.isBlank()) {
            return;
        }
        billingRepository.findByRemoteInvoiceId(remoteInvoiceId).ifPresent(record -> {
            record.setInvoiceStatus(CommissionInvoiceStatus.SETTLED);
            record.setPendingAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            record.setSettledAt(clock.instant());
            record.setGraceStartedAt(null);
            record.setGraceEndsAt(null);
            billingRepository.save(record);
            broadcastSummary();
        });
    }

    /**
     * Marks a billing period as in grace-period warning when a remote Stripe invoice payment fails.
     *
     * @param remoteInvoiceId External Stripe invoice identifier
     * @param amountDue       Unpaid amount due
     */
    @Transactional
    public void markRemoteInvoicePaymentFailed(String remoteInvoiceId, BigDecimal amountDue) {
        if (remoteInvoiceId == null || remoteInvoiceId.isBlank()) {
            return;
        }
        Optional<CommissionBillingRecord> found = billingRepository.findByRemoteInvoiceId(remoteInvoiceId);
        if (found.isPresent()) {
            CommissionBillingRecord r = found.get();
            updateBillingStatus(
                    r.getBillingPeriod(),
                    remoteInvoiceId,
                    CommissionInvoiceStatus.GRACE_PERIOD,
                    amountDue != null ? amountDue : r.getTotalCommissionDue(),
                    r.getGraceEndsAt(),
                    "PAYMENT_FAILED",
                    "Remote commission invoice payment failed"
            );
        } else {
            String currentPeriod = YearMonth.now(clock.withZone(ZoneId.systemDefault())).toString();
            updateBillingStatus(
                    currentPeriod,
                    remoteInvoiceId,
                    CommissionInvoiceStatus.GRACE_PERIOD,
                    amountDue != null ? amountDue : BigDecimal.ZERO,
                    null,
                    "PAYMENT_FAILED",
                    "Remote commission invoice payment failed"
            );
        }
    }

    /**
     * Marks Option 1 entries as synchronized online after successful transmission to the billing service.
     *
     * @param entryIds Database IDs of synced entries
     * @return Count of updated entries
     */
    @Transactional
    public int markEntriesSyncedOnline(List<Long> entryIds) {
        if (entryIds == null || entryIds.isEmpty()) {
            return 0;
        }
        Instant now = clock.instant().truncatedTo(ChronoUnit.MILLIS);
        List<CardCommissionLedgerEntry> entries = ledgerRepository.findAllById(entryIds);
        int updated = 0;
        for (CardCommissionLedgerEntry e : entries) {
            if (e.getTier() == TpeMonetizationTier.CONCERT_IP_OFFLINE
                    && e.getStatus() != CardCommissionStatus.SYNCED_ONLINE) {
                e.setStatus(CardCommissionStatus.SYNCED_ONLINE);
                e.setSyncedAt(now);
                updated++;
            }
        }
        if (updated > 0) {
            ledgerRepository.saveAll(entries);
        }
        return updated;
    }

    /**
     * Evaluates deterministic SHA-256 seal for any {@link CardCommissionLedgerEntry}.
     *
     * @param e Ledger entry
     * @return 64-character lowercase SHA-256 hex digest
     */
    public String computeEntryHash(CardCommissionLedgerEntry e) {
        String canonical = String.join("|",
                String.valueOf(e.getSequenceNumber()),
                safe(e.getBillingPeriod()),
                safe(e.getEstablishmentId()),
                String.valueOf(e.getFactureId()),
                String.valueOf(e.getReglementId()),
                safe(e.getExternalTransactionId()),
                e.getTier().name(),
                e.getSource().name(),
                e.getGrossAmount().setScale(2, RoundingMode.HALF_UP).toPlainString(),
                String.valueOf(e.getRateBps()),
                String.valueOf(e.getFixedFeeCents()),
                e.getCommissionAmount().setScale(2, RoundingMode.HALF_UP).toPlainString(),
                safe(e.getCurrency()),
                e.getRecordedAt().truncatedTo(ChronoUnit.MILLIS).toString(),
                safe(e.getPreviousHash())
        );
        return sha256Hex(canonical);
    }

    private Optional<CardCommissionLedgerEntry> findExistingEntry(CardSettlementRecordCommand cmd) {
        if (cmd.externalTransactionId() != null && !cmd.externalTransactionId().isBlank()) {
            Optional<CardCommissionLedgerEntry> byExt =
                    ledgerRepository.findByExternalTransactionId(cmd.externalTransactionId().trim());
            if (byExt.isPresent()) {
                return byExt;
            }
        }
        if (cmd.factureId() != null) {
            boolean duplicate = cmd.reglementId() != null
                    ? ledgerRepository.existsByFactureIdAndReglementId(cmd.factureId(), cmd.reglementId())
                    : ledgerRepository.existsByFactureIdAndReglementIdIsNull(cmd.factureId());
            if (duplicate) {
                return ledgerRepository.findAllByOrderBySequenceNumberAsc().stream()
                        .filter(e -> cmd.factureId().equals(e.getFactureId())
                                && java.util.Objects.equals(cmd.reglementId(), e.getReglementId()))
                        .findFirst();
            }
        }
        return Optional.empty();
    }

    private void recalculateBillingPeriod(String billingPeriod, String establishmentId) {
        List<CardCommissionLedgerEntry> entries =
                ledgerRepository.findByBillingPeriodOrderBySequenceNumberAsc(billingPeriod);
        PeriodTotals totals = computePeriodTotals(entries);
        CommissionBillingRecord record = getOrCreateBillingRecord(billingPeriod, establishmentId);
        applyTotalsToBillingRecord(record, totals);
        record.setActiveTier(commissionCalculator.resolveEffectiveRates().activeTier());
        if (!entries.isEmpty()) {
            record.setEndLedgerHash(entries.getLast().getEntryHash());
        }
        billingRepository.save(record);
    }

    private PeriodTotals computePeriodTotals(List<CardCommissionLedgerEntry> entries) {
        BigDecimal opt1Vol = BigDecimal.ZERO;
        long opt1Count = 0L;
        BigDecimal opt1Comm = BigDecimal.ZERO;
        BigDecimal opt3Vol = BigDecimal.ZERO;
        long opt3Count = 0L;
        BigDecimal opt3Comm = BigDecimal.ZERO;

        for (CardCommissionLedgerEntry e : entries) {
            if (e.getTier() == TpeMonetizationTier.STRIPE_TERMINAL_CONNECT) {
                opt3Vol = opt3Vol.add(e.getGrossAmount());
                opt3Count++;
                opt3Comm = opt3Comm.add(e.getCommissionAmount());
            } else {
                opt1Vol = opt1Vol.add(e.getGrossAmount());
                opt1Count++;
                opt1Comm = opt1Comm.add(e.getCommissionAmount());
            }
        }
        return new PeriodTotals(
                opt1Vol.setScale(2, RoundingMode.HALF_UP),
                opt1Count,
                opt1Comm.setScale(2, RoundingMode.HALF_UP),
                opt3Vol.setScale(2, RoundingMode.HALF_UP),
                opt3Count,
                opt3Comm.setScale(2, RoundingMode.HALF_UP)
        );
    }

    private void applyTotalsToBillingRecord(CommissionBillingRecord record, PeriodTotals totals) {
        record.setOption1Volume(totals.opt1Vol());
        record.setOption1Count(totals.opt1Count());
        record.setOption1Commission(totals.opt1Comm());
        record.setOption3Volume(totals.opt3Vol());
        record.setOption3Count(totals.opt3Count());
        record.setOption3Commission(totals.opt3Comm());
        record.setTotalCommissionDue(totals.opt1Comm());
    }

    private void markOfflineExported(List<CardCommissionLedgerEntry> periodEntries) {
        List<CardCommissionLedgerEntry> toUpdate = periodEntries.stream()
                .filter(e -> e.getTier() == TpeMonetizationTier.CONCERT_IP_OFFLINE
                        && e.getStatus() == CardCommissionStatus.ACCUMULATED)
                .toList();
        if (!toUpdate.isEmpty()) {
            toUpdate.forEach(e -> e.setStatus(CardCommissionStatus.EXPORTED_OFFLINE));
            ledgerRepository.saveAll(toUpdate);
        }
    }

    private CommissionBillingRecord getOrCreateBillingRecord(String billingPeriod, String establishmentId) {
        return billingRepository.findByBillingPeriod(billingPeriod).orElseGet(() -> {
            CommissionBillingRecord created = new CommissionBillingRecord();
            created.setBillingPeriod(billingPeriod);
            created.setEstablishmentId(establishmentId);
            created.setActiveTier(commissionCalculator.resolveEffectiveRates().activeTier());
            return created;
        });
    }

    private MonetizationSummaryDTO buildSummaryFromRecord(
            TpeMonetizationTier activeTier, CommissionBillingRecord record, Instant now) {
        CommissionInvoiceStatus status = record.getInvoiceStatus();
        Instant graceEndsAt = record.getGraceEndsAt();
        if ((status == CommissionInvoiceStatus.PENDING || status == CommissionInvoiceStatus.GRACE_PERIOD)
                && graceEndsAt != null && now.isAfter(graceEndsAt)) {
            status = CommissionInvoiceStatus.OVERDUE;
        }
        long graceHours = computeGraceHoursRemaining(now, graceEndsAt, status);
        boolean enforce = monetizationProperties.isEnforceGraceLock();
        boolean locked = enforce && status == CommissionInvoiceStatus.OVERDUE;
        boolean showBanner = status == CommissionInvoiceStatus.PENDING
                || status == CommissionInvoiceStatus.GRACE_PERIOD
                || status == CommissionInvoiceStatus.OVERDUE;
        BigDecimal pendingAmt = record.getPendingAmount() != null && record.getPendingAmount().compareTo(BigDecimal.ZERO) > 0
                ? record.getPendingAmount()
                : record.getTotalCommissionDue();

        return new MonetizationSummaryDTO(
                activeTier,
                record.getBillingPeriod(),
                status,
                record.getRemoteInvoiceId(),
                pendingAmt.setScale(2, RoundingMode.HALF_UP),
                graceEndsAt,
                graceHours,
                enforce,
                locked,
                showBanner
        );
    }

    private MonetizationSummaryDTO buildSummaryFromJwtClaims(
            TpeMonetizationTier activeTier, LicenseCryptoService.LicenseMonetizationClaims claims, Instant now) {
        CommissionInvoiceStatus status = parseClaimStatus(claims.commissionStatus());
        Instant graceEndsAt = claims.commissionGraceEndsAt();
        if (status == CommissionInvoiceStatus.GRACE_PERIOD && graceEndsAt != null && now.isAfter(graceEndsAt)) {
            status = CommissionInvoiceStatus.OVERDUE;
        }
        long graceHours = computeGraceHoursRemaining(now, graceEndsAt, status);
        boolean enforce = monetizationProperties.isEnforceGraceLock();
        boolean locked = enforce && status == CommissionInvoiceStatus.OVERDUE;
        BigDecimal pendingAmt = claims.pendingCommissionAmount() != null
                ? claims.pendingCommissionAmount()
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        return new MonetizationSummaryDTO(
                activeTier,
                YearMonth.now(clock.withZone(ZoneId.systemDefault())).toString(),
                status,
                claims.pendingCommissionInvoiceId(),
                pendingAmt,
                graceEndsAt,
                graceHours,
                enforce,
                locked,
                true
        );
    }

    private long computeGraceHoursRemaining(Instant now, Instant graceEndsAt, CommissionInvoiceStatus status) {
        if (graceEndsAt == null || status == CommissionInvoiceStatus.OVERDUE || status == CommissionInvoiceStatus.SETTLED) {
            return 0L;
        }
        long mins = Math.max(0L, Duration.between(now, graceEndsAt).toMinutes());
        return mins > 0 ? Math.max(1L, (mins + 59L) / 60L) : 0L;
    }

    private boolean isPendingClaimStatus(String status) {
        if (status == null || status.isBlank()) {
            return false;
        }
        String norm = status.trim().toUpperCase(Locale.ROOT);
        return "PENDING".equals(norm) || "GRACE_PERIOD".equals(norm) || "OVERDUE".equals(norm);
    }

    private CommissionInvoiceStatus parseClaimStatus(String raw) {
        try {
            return CommissionInvoiceStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception _) {
            return CommissionInvoiceStatus.PENDING;
        }
    }

    private String buildCanonicalProofPayload(
            String period,
            String establishmentId,
            Instant generatedAt,
            PeriodTotals totals,
            String startHash,
            String endHash,
            boolean chainValid,
            List<MonthlyCommissionProofDTO.ZReportDigestDTO> zReports) {
        String zDigests = zReports.stream()
                .map(z -> z.closureNumber() + ":" + z.closureDate() + ":" + z.sha256Hash())
                .reduce((a, b) -> a + "," + b)
                .orElse("");
        return String.join("|",
                period,
                establishmentId,
                generatedAt.toString(),
                totals.opt1Vol().toPlainString(),
                String.valueOf(totals.opt1Count()),
                totals.opt1Comm().toPlainString(),
                totals.opt3Vol().toPlainString(),
                String.valueOf(totals.opt3Count()),
                totals.opt3Comm().toPlainString(),
                startHash,
                endHash,
                String.valueOf(chainValid),
                zDigests
        );
    }

    private String encodeCompactProofToken(
            String period,
            String establishmentId,
            String payloadDigest,
            String hmacSig,
            PeriodTotals totals,
            String endHash) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("period", period);
        body.put("establishmentId", establishmentId);
        body.put("option1Volume", totals.opt1Vol());
        body.put("option1Commission", totals.opt1Comm());
        body.put("option3Volume", totals.opt3Vol());
        body.put("option3Commission", totals.opt3Comm());
        body.put("endLedgerHash", endHash);
        body.put("payloadDigest", payloadDigest);
        body.put("hmac", hmacSig);
        String json = serializeSafe(body);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private String computeHmacSha256Hex(String payload, String establishmentId) {
        try {
            String configured = monetizationProperties.getHmacSecret();
            String keyMaterial = (configured != null && !configured.isBlank())
                    ? configured
                    : sha256Hex(establishmentId + ":" + (jwtProperties != null ? jwtProperties.getSecret() : "openbar-monetization"));
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keyMaterial.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(raw);
        } catch (NoSuchAlgorithmException | InvalidKeyException ex) {
            log.warn("HMAC computation fallback triggered: {}", ex.getMessage());
            return sha256Hex(payload);
        }
    }

    private String sha256Hex(String input) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
        }
    }

    private String resolveEstablishmentId() {
        return licenseService != null ? licenseService.resolveVenueEstablishmentId() : "establishment-1";
    }

    private String normalizeCurrency(String currency) {
        return (currency != null && !currency.isBlank()) ? currency.trim().toUpperCase(Locale.ROOT) : "EUR";
    }

    private String safe(String val) {
        return val != null ? val : "";
    }

    private String serializeSafe(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception _) {
            return "[]";
        }
    }

    private void broadcastSummary() {
        if (notificationService != null) {
            try {
                notificationService.notifierMonetizationMiseAJour(getSummary());
            } catch (Exception ex) {
                log.debug("Could not broadcast monetization update: {}", ex.getMessage());
            }
        }
    }

    private record PeriodTotals(
            BigDecimal opt1Vol,
            long opt1Count,
            BigDecimal opt1Comm,
            BigDecimal opt3Vol,
            long opt3Count,
            BigDecimal opt3Comm
    ) {
    }

    /**
     * Command record describing a settled card transaction to seal into the ledger.
     *
     * @param factureId             Invoice identifier
     * @param reglementId           Split settlement identifier (nullable)
     * @param invoiceNumber         Invoice serial number
     * @param externalTransactionId TPE UUID or Stripe PaymentIntent ID
     * @param tpeAuthorizationCode  Card authorization number
     * @param tpeTerminalId         Terminal ID
     * @param cardBrand             Card network brand
     * @param maskedPan             Masked PAN
     * @param source                Card payment channel
     * @param grossAmount           Gross charged card amount
     * @param currency              ISO currency code
     */
    public record CardSettlementRecordCommand(
            Long factureId,
            Long reglementId,
            String invoiceNumber,
            String externalTransactionId,
            String tpeAuthorizationCode,
            String tpeTerminalId,
            String cardBrand,
            String maskedPan,
            CardCommissionSource source,
            BigDecimal grossAmount,
            String currency
    ) {
    }
}
