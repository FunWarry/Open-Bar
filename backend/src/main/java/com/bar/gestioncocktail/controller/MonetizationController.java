package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CardCommissionLedgerEntryDTO;
import com.bar.gestioncocktail.dto.CommissionSyncResultDTO;
import com.bar.gestioncocktail.dto.LedgerVerificationDTO;
import com.bar.gestioncocktail.dto.MonetizationDashboardDTO;
import com.bar.gestioncocktail.dto.MonetizationSummaryDTO;
import com.bar.gestioncocktail.dto.MonthlyCommissionProofDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.CardCommissionLedgerRepository;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.AuditLogService;
import com.bar.gestioncocktail.service.monetization.CommissionLedgerService;
import com.bar.gestioncocktail.service.monetization.CommissionSyncService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * REST controller for OpenBar's dual-tier TPE payment monetization engine.
 * Exposes Option 1 vs Option 3 commission dashboards, SHA-256 ledger integrity verification,
 * signed offline monthly Z-report proof exports for openbar.fr portal renewal,
 * online billing synchronization, and staff grace-period status summaries.
 */
@RestController
@RequestMapping("/api/admin/monetization")
@Tag(name = "TPE Monetization", description = "Dual-tier TPE commission ledger, SHA-256 verification, offline Z-report proof exports, and billing sync")
public class MonetizationController {

    private static final String ENTITY_MONETIZATION = "CommissionLedger";

    private final CommissionLedgerService ledgerService;
    private final CommissionSyncService syncService;
    private final CardCommissionLedgerRepository ledgerRepository;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    /**
     * Constructs MonetizationController with ledger, sync, audit, and serialization services.
     */
    public MonetizationController(
            CommissionLedgerService ledgerService,
            CommissionSyncService syncService,
            CardCommissionLedgerRepository ledgerRepository,
            AuditLogService auditLogService,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.ledgerService = ledgerService;
        this.syncService = syncService;
        this.ledgerRepository = ledgerRepository;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Lightweight staff status summary driving Admin Settings warnings, global banners, and POS TPE locks.
     *
     * @return {@link MonetizationSummaryDTO}
     */
    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get TPE monetization & grace status", description = "Returns active TPE tier, pending commission invoice balance, grace countdown, and card lock flag.")
    @ApiResponse(responseCode = "200", description = "Monetization status retrieved successfully")
    public ResponseEntity<MonetizationSummaryDTO> getSummary() {
        return ResponseEntity.ok(ledgerService.getSummary());
    }

    /**
     * Full administrative monetization dashboard for a billing period (YYYY-MM).
     *
     * @param period Optional YYYY-MM period (defaults to current month)
     * @return {@link MonetizationDashboardDTO}
     */
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get monetization dashboard (ADMIN/MANAGER)", description = "Retrieves rate schedule, Option 1 vs Option 3 volumes, SHA-256 chain integrity, and ledger entries.")
    @ApiResponse(responseCode = "200", description = "Dashboard retrieved successfully")
    public ResponseEntity<MonetizationDashboardDTO> getDashboard(
            @Parameter(description = "Billing period in YYYY-MM format") @RequestParam(required = false) String period) {
        return ResponseEntity.ok(ledgerService.getDashboard(parsePeriodOrNull(period)));
    }

    /**
     * Retrieves sealed card commission ledger entries for a target period or all entries.
     *
     * @param period Optional YYYY-MM filter
     * @return Ordered list of {@link CardCommissionLedgerEntryDTO}
     */
    @GetMapping("/ledger")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "List sealed card commission ledger entries", description = "Returns chronological SHA-256 hash-chained card transaction commission entries.")
    @ApiResponse(responseCode = "200", description = "Ledger entries retrieved successfully")
    public ResponseEntity<List<CardCommissionLedgerEntryDTO>> getLedger(
            @Parameter(description = "Optional billing period (YYYY-MM)") @RequestParam(required = false) String period) {
        YearMonth parsed = parsePeriodOrNull(period);
        List<CardCommissionLedgerEntryDTO> result = (parsed != null
                ? ledgerRepository.findByBillingPeriodOrderBySequenceNumberAsc(parsed.toString())
                : ledgerRepository.findAllByOrderBySequenceNumberAsc())
                .stream()
                .map(CardCommissionLedgerEntryDTO::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Runs cryptographic SHA-256 chain integrity audit across the entire local commission ledger.
     *
     * @return {@link LedgerVerificationDTO}
     */
    @PostMapping("/verify")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Verify SHA-256 ledger integrity", description = "Recomputes SHA-256 seals and verifies chain linkage across all card commission ledger entries.")
    @ApiResponse(responseCode = "200", description = "Verification audit completed")
    public ResponseEntity<LedgerVerificationDTO> verifyIntegrity(HttpServletRequest httpRequest) {
        LedgerVerificationDTO result = ledgerService.verifyLedgerIntegrity();
        auditLogService.logAction(
                resolveCurrentUser(),
                "VERIFY_COMMISSION_LEDGER",
                ENTITY_MONETIZATION,
                1L,
                "SHA-256 ledger verification: valid=" + result.valid() + ", verified=" + result.verifiedEntries(),
                resolveClientIp(httpRequest)
        );
        return ResponseEntity.ok(result);
    }

    /**
     * Exports a signed monthly Z-report & card commission proof JSON payload for openbar.fr portal upload.
     *
     * @param period Optional YYYY-MM period (defaults to current month)
     * @return {@link MonthlyCommissionProofDTO}
     */
    @GetMapping("/export-proof")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Generate signed offline monthly Z-report proof", description = "Exports cryptographic proof of monthly card totals and certified Z-reports for offline license renewal.")
    @ApiResponse(responseCode = "200", description = "Signed monthly proof generated")
    public ResponseEntity<MonthlyCommissionProofDTO> exportMonthlyProof(
            @Parameter(description = "Billing period in YYYY-MM format") @RequestParam(required = false) String period,
            HttpServletRequest httpRequest) {
        MonthlyCommissionProofDTO proof = ledgerService.exportMonthlyProof(parsePeriodOrNull(period));
        auditLogService.logAction(
                resolveCurrentUser(),
                "EXPORT_MONTHLY_COMMISSION_PROOF",
                ENTITY_MONETIZATION,
                1L,
                "Exported signed Z-report proof for period " + proof.billingPeriod() + " (due=" + proof.totalCommissionDue() + ")",
                resolveClientIp(httpRequest)
        );
        return ResponseEntity.ok(proof);
    }

    /**
     * Downloads the signed monthly Z-report & card commission proof as a formatted .json file attachment.
     *
     * @param period Optional YYYY-MM period
     * @return JSON attachment bytes
     */
    @GetMapping(value = "/export-proof/download", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Download signed monthly proof .json file", description = "Downloads the cryptographically signed monthly Z-report proof file for openbar.fr portal upload.")
    @ApiResponse(responseCode = "200", description = "Signed monthly proof file downloaded")
    public ResponseEntity<byte[]> downloadMonthlyProof(
            @Parameter(description = "Billing period in YYYY-MM format") @RequestParam(required = false) String period,
            HttpServletRequest httpRequest) {
        MonthlyCommissionProofDTO proof = ledgerService.exportMonthlyProof(parsePeriodOrNull(period));
        auditLogService.logAction(
                resolveCurrentUser(),
                "DOWNLOAD_MONTHLY_COMMISSION_PROOF",
                ENTITY_MONETIZATION,
                1L,
                "Downloaded signed Z-report proof JSON for period " + proof.billingPeriod(),
                resolveClientIp(httpRequest)
        );
        try {
            byte[] jsonBytes = objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(proof)
                    .getBytes(StandardCharsets.UTF_8);
            String filename = "openbar-commission-proof-" + proof.billingPeriod() + ".json";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(jsonBytes);
        } catch (Exception ex) {
            throw new BusinessException("Failed to serialize monthly proof JSON: " + ex.getMessage());
        }
    }

    /**
     * Synchronizes Option 1 card commission receipts with the remote Stripe Billing service.
     *
     * @param period      Optional YYYY-MM period
     * @param httpRequest Servlet request for audit logging
     * @return {@link CommissionSyncResultDTO}
     */
    @PostMapping("/sync")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Sync card commission receipts online (ADMIN)", description = "Transmits signed Option 1 card volumes to the central Stripe Billing service; fails open if offline.")
    @ApiResponse(responseCode = "200", description = "Sync attempt completed")
    public ResponseEntity<CommissionSyncResultDTO> syncOnline(
            @Parameter(description = "Optional billing period in YYYY-MM format") @RequestParam(required = false) String period,
            HttpServletRequest httpRequest) {
        User actor = resolveCurrentUser();
        String actorName = actor != null ? actor.getUsername() : "admin";
        CommissionSyncResultDTO result = syncService.syncNow(parsePeriodOrNull(period), actorName);
        auditLogService.logAction(
                actor,
                "SYNC_COMMISSION_LEDGER",
                ENTITY_MONETIZATION,
                1L,
                "Online billing sync result: " + result.syncStatus() + " (" + result.syncedEntriesCount() + " entries)",
                resolveClientIp(httpRequest)
        );
        return ResponseEntity.ok(result);
    }

    private YearMonth parsePeriodOrNull(String rawPeriod) {
        if (rawPeriod == null || rawPeriod.isBlank()) {
            return null;
        }
        try {
            return YearMonth.parse(rawPeriod.trim());
        } catch (DateTimeParseException _) {
            throw new BusinessException("Invalid billing period format '" + rawPeriod + "'. Expected YYYY-MM.");
        }
    }

    private User resolveCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    private String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
