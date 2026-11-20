package com.bar.gestioncocktail.service.monetization;

import com.bar.gestioncocktail.config.MonetizationProperties;
import com.bar.gestioncocktail.dto.CommissionSyncResultDTO;
import com.bar.gestioncocktail.dto.MonetizationSummaryDTO;
import com.bar.gestioncocktail.dto.MonthlyCommissionProofDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.CardCommissionLedgerEntry;
import com.bar.gestioncocktail.model.CardCommissionStatus;
import com.bar.gestioncocktail.model.CommissionInvoiceStatus;
import com.bar.gestioncocktail.model.TpeMonetizationTier;
import com.bar.gestioncocktail.repository.CardCommissionLedgerRepository;
import com.bar.gestioncocktail.service.LicenseService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Online synchronization service transmitting signed Option 1 card volume receipts
 * to the central OpenBar Stripe Billing service when internet connectivity is available,
 * while remaining fail-open for air-gapped on-premise venues.
 */
@Service
public class CommissionSyncService {

    private static final Logger log = LoggerFactory.getLogger(CommissionSyncService.class);
    private static final String STATUS_OFFLINE = "OFFLINE";
    private static final String STATUS_FAILED = "FAILED";
    private static final String STATUS_UP_TO_DATE = "UP_TO_DATE";
    private static final String STATUS_SUCCESS = "SUCCESS";

    private final CommissionLedgerService ledgerService;
    private final CardCommissionLedgerRepository ledgerRepository;
    private final LicenseService licenseService;
    private final MonetizationProperties monetizationProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    /**
     * Constructs CommissionSyncService with default JDK {@link HttpClient}.
     */
    @Autowired
    public CommissionSyncService(
            CommissionLedgerService ledgerService,
            CardCommissionLedgerRepository ledgerRepository,
            LicenseService licenseService,
            MonetizationProperties monetizationProperties,
            ObjectMapper objectMapper) {
        this(
                ledgerService,
                ledgerRepository,
                licenseService,
                monetizationProperties,
                objectMapper,
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofMillis(Math.max(1000, monetizationProperties.getSyncTimeoutMs())))
                        .build()
        );
    }

    /**
     * Constructs CommissionSyncService with an explicit {@link HttpClient} for unit testing.
     */
    public CommissionSyncService(
            CommissionLedgerService ledgerService,
            CardCommissionLedgerRepository ledgerRepository,
            LicenseService licenseService,
            MonetizationProperties monetizationProperties,
            ObjectMapper objectMapper,
            HttpClient httpClient) {
        this.ledgerService = ledgerService;
        this.ledgerRepository = ledgerRepository;
        this.licenseService = licenseService;
        this.monetizationProperties = monetizationProperties;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    /**
     * Periodic background synchronization triggered when {@code openbar.monetization.sync-enabled=true}.
     */
    @Scheduled(
            fixedDelayString = "${openbar.monetization.sync-interval-ms:21600000}",
            initialDelayString = "${openbar.monetization.sync-initial-delay-ms:45000}"
    )
    public void scheduledSync() {
        if (!monetizationProperties.isSyncEnabled()) {
            return;
        }
        try {
            syncNow(YearMonth.now(), "scheduler");
        } catch (Exception ex) {
            log.debug("Background commission sync skipped cleanly: {}", ex.getMessage());
        }
    }

    /**
     * Synchronizes Option 1 card commission receipts and monthly Z-report proof with the remote billing service.
     *
     * @param period        Target billing month (defaults to current month)
     * @param actorUsername Initiating username or subsystem
     * @return {@link CommissionSyncResultDTO}
     */
    public CommissionSyncResultDTO syncNow(YearMonth period, String actorUsername) {
        YearMonth target = period != null ? period : YearMonth.now();
        String periodStr = target.toString();
        String syncUrl = monetizationProperties.getBillingSyncUrl();

        if (syncUrl == null || syncUrl.isBlank()) {
            return new CommissionSyncResultDTO(false, false, STATUS_OFFLINE, 0,
                    "No commission billing sync URL configured", ledgerService.getSummary());
        }

        try {
            URI uri = URI.create(syncUrl.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme()) && !"http".equalsIgnoreCase(uri.getScheme())) {
                throw new BusinessException("Invalid commission billing sync URL scheme");
            }

            List<CardCommissionLedgerEntry> unsyncedEntries = ledgerRepository
                    .findByBillingPeriodOrderBySequenceNumberAsc(periodStr)
                    .stream()
                    .filter(e -> e.getTier() == TpeMonetizationTier.CONCERT_IP_OFFLINE
                            && (e.getStatus() == CardCommissionStatus.ACCUMULATED
                            || e.getStatus() == CardCommissionStatus.EXPORTED_OFFLINE))
                    .toList();

            MonthlyCommissionProofDTO proof = ledgerService.exportMonthlyProof(target);
            Map<String, Object> payload = buildSyncPayload(proof, unsyncedEntries, actorUsername);

            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofMillis(Math.max(1000, monetizationProperties.getSyncTimeoutMs())))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return handleSyncHttpResponse(response, periodStr, unsyncedEntries);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            ledgerService.updateBillingStatus(periodStr, null, null, null, null, STATUS_OFFLINE, "Sync interrupted");
            return new CommissionSyncResultDTO(false, false, STATUS_OFFLINE, 0,
                    "Online commission sync interrupted", ledgerService.getSummary());
        } catch (IOException ex) {
            log.debug("Commission billing sync offline: {}", ex.getMessage());
            ledgerService.updateBillingStatus(periodStr, null, null, null, null,
                    STATUS_OFFLINE, "Network unreachable: " + ex.getMessage());
            return new CommissionSyncResultDTO(false, false, STATUS_OFFLINE, 0,
                    "Central billing service unreachable — continuing in offline mode", ledgerService.getSummary());
        } catch (IllegalArgumentException | BusinessException ex) {
            ledgerService.updateBillingStatus(periodStr, null, null, null, null, STATUS_FAILED, ex.getMessage());
            return new CommissionSyncResultDTO(false, false, STATUS_FAILED, 0,
                    ex.getMessage(), ledgerService.getSummary());
        }
    }

    private Map<String, Object> buildSyncPayload(
            MonthlyCommissionProofDTO proof,
            List<CardCommissionLedgerEntry> unsyncedEntries,
            String actorUsername) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("establishmentId", proof.establishmentId());
        payload.put("billingPeriod", proof.billingPeriod());
        payload.put("actor", actorUsername);
        payload.put("licenseToken", licenseService != null ? licenseService.getStoredToken() : null);
        payload.put("proof", proof);
        payload.put("unsyncedEntryCount", unsyncedEntries.size());
        return payload;
    }

    private CommissionSyncResultDTO handleSyncHttpResponse(
            HttpResponse<String> response,
            String periodStr,
            List<CardCommissionLedgerEntry> unsyncedEntries) {

        int statusCode = response.statusCode();
        if (statusCode == 204) {
            ledgerService.updateBillingStatus(periodStr, null, null, null, null, STATUS_UP_TO_DATE, null);
            return new CommissionSyncResultDTO(false, true, STATUS_UP_TO_DATE, 0,
                    "Commission billing ledger is already up to date", ledgerService.getSummary());
        }
        if (statusCode < 200 || statusCode >= 300) {
            String err = "Central billing server returned HTTP " + statusCode;
            ledgerService.updateBillingStatus(periodStr, null, null, null, null, STATUS_FAILED, err);
            return new CommissionSyncResultDTO(false, true, STATUS_FAILED, 0, err, ledgerService.getSummary());
        }

        try {
            List<Long> ids = unsyncedEntries.stream().map(CardCommissionLedgerEntry::getId).toList();
            int updatedCount = ledgerService.markEntriesSyncedOnline(ids);

            JsonNode root = objectMapper.readTree(response.body() != null ? response.body() : "{}");
            String invoiceId = textOrNull(root, "invoiceId");
            CommissionInvoiceStatus invoiceStatus = parseInvoiceStatus(textOrNull(root, "invoiceStatus"));
            BigDecimal pendingAmount = root.hasNonNull("pendingAmount")
                    ? new BigDecimal(root.get("pendingAmount").asText("0"))
                    : null;
            Instant graceEndsAt = parseInstantOrNull(textOrNull(root, "graceEndsAt"));

            ledgerService.updateBillingStatus(
                    periodStr, invoiceId, invoiceStatus, pendingAmount, graceEndsAt, STATUS_SUCCESS, null);

            MonetizationSummaryDTO summary = ledgerService.getSummary();
            return new CommissionSyncResultDTO(true, true, STATUS_SUCCESS, updatedCount,
                    "Synchronized " + updatedCount + " card volume entries with central Stripe Billing", summary);
        } catch (Exception ex) {
            String err = "Rejected invalid billing sync payload: " + ex.getMessage();
            ledgerService.updateBillingStatus(periodStr, null, null, null, null, STATUS_FAILED, err);
            return new CommissionSyncResultDTO(false, true, STATUS_FAILED, 0, err, ledgerService.getSummary());
        }
    }

    private String textOrNull(JsonNode root, String field) {
        if (!root.hasNonNull(field)) {
            return null;
        }
        String val = root.get(field).asText("").trim();
        return val.isEmpty() ? null : val;
    }

    private CommissionInvoiceStatus parseInvoiceStatus(String raw) {
        if (raw == null) {
            return null;
        }
        try {
            return CommissionInvoiceStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException _) {
            return null;
        }
    }

    private Instant parseInstantOrNull(String raw) {
        if (raw == null) {
            return null;
        }
        try {
            return Instant.parse(raw);
        } catch (Exception _) {
            return null;
        }
    }
}
