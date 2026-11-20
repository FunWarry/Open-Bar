package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.LicenseActivateRequest;
import com.bar.gestioncocktail.dto.LicenseStatusDTO;
import com.bar.gestioncocktail.dto.LicenseSummaryDTO;
import com.bar.gestioncocktail.dto.LicenseSyncResultDTO;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.AuditLogService;
import com.bar.gestioncocktail.service.LicenseService;
import com.bar.gestioncocktail.service.LicenseSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller managing OpenBar's hybrid offline/online DRM licensing engine.
 * Exposes status inspection, manual offline JWT license activation, online sync triggers,
 * and lightweight staff status summaries.
 */
@RestController
@RequestMapping("/api/admin/license")
@Tag(name = "Licensing", description = "Hybrid offline/online DRM license verification, manual activation, and synchronization")
public class LicenseController {

    private static final String ENTITY_LICENSE = "LicenseRecord";

    private final LicenseService licenseService;
    private final LicenseSyncService licenseSyncService;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    /**
     * Constructs LicenseController with licensing, sync, audit, and user services.
     *
     * @param licenseService     Core licensing evaluation service
     * @param licenseSyncService Online license synchronization service
     * @param auditLogService    Audit trail service
     * @param userRepository     User lookup repository for audit attribution
     */
    public LicenseController(
            LicenseService licenseService,
            LicenseSyncService licenseSyncService,
            AuditLogService auditLogService,
            UserRepository userRepository) {
        this.licenseService = licenseService;
        this.licenseSyncService = licenseSyncService;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
    }

    /**
     * Retrieves full administrative license diagnostics, claims, modules, and sync telemetry.
     *
     * @return Detailed {@link LicenseStatusDTO}
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get detailed license status (ADMIN/MANAGER)", description = "Retrieves full cryptographic license claims, expiration countdown, module entitlements, and sync status.")
    @ApiResponse(responseCode = "200", description = "License status retrieved successfully")
    public ResponseEntity<LicenseStatusDTO> getLicenseStatus() {
        return ResponseEntity.ok(licenseService.getLicenseStatus());
    }

    /**
     * Retrieves lightweight license status summary for authenticated staff warning banners.
     *
     * @return Lightweight {@link LicenseSummaryDTO}
     */
    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get staff license summary", description = "Retrieves lightweight license status, grace countdown, and order-taking lock state for authenticated staff.")
    @ApiResponse(responseCode = "200", description = "License summary retrieved successfully")
    public ResponseEntity<LicenseSummaryDTO> getLicenseSummary() {
        return ResponseEntity.ok(licenseService.getLicenseSummary());
    }

    /**
     * Validates and activates a signed JWT license token entered manually for offline/air-gapped venues.
     *
     * @param request     Payload containing the signed JWT license key
     * @param httpRequest Servlet request for audit IP extraction
     * @return Updated {@link LicenseStatusDTO}
     */
    @PostMapping("/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activate offline license key (ADMIN)", description = "Cryptographically verifies an ECDSA/RSA signed JWT license key and activates it for this establishment.")
    @ApiResponse(responseCode = "200", description = "License activated successfully")
    @ApiResponse(responseCode = "400", description = "Invalid signature, malformed JWT, or establishment mismatch")
    public ResponseEntity<LicenseStatusDTO> activateOfflineLicense(
            @Valid @RequestBody LicenseActivateRequest request,
            HttpServletRequest httpRequest) {
        User actor = resolveCurrentUser();
        String actorName = actor != null ? actor.getUsername() : "admin";
        LicenseStatusDTO result = licenseService.activateLicense(request.licenseToken(), "OFFLINE", actorName);
        auditLogService.logAction(
                actor,
                "ACTIVATE_LICENSE_OFFLINE",
                ENTITY_LICENSE,
                1L,
                "Activated " + result.plan() + " license for establishment " + result.establishmentId(),
                resolveClientIp(httpRequest)
        );
        return ResponseEntity.ok(result);
    }

    /**
     * Triggers an immediate online license synchronization check against the configured licensing server.
     *
     * @param httpRequest Servlet request for audit IP extraction
     * @return {@link LicenseSyncResultDTO} describing connectivity, sync outcome, and updated license state
     */
    @PostMapping("/sync")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Sync license online (ADMIN)", description = "Attempts immediate online synchronization with the OpenBar licensing server; fails open if offline.")
    @ApiResponse(responseCode = "200", description = "Sync attempt completed")
    public ResponseEntity<LicenseSyncResultDTO> syncLicenseOnline(HttpServletRequest httpRequest) {
        User actor = resolveCurrentUser();
        String actorName = actor != null ? actor.getUsername() : "admin";
        LicenseSyncResultDTO syncResult = licenseSyncService.syncNow(actorName);
        auditLogService.logAction(
                actor,
                "SYNC_LICENSE_ONLINE",
                ENTITY_LICENSE,
                1L,
                "License sync result: " + syncResult.syncStatus() + " — " + syncResult.message(),
                resolveClientIp(httpRequest)
        );
        return ResponseEntity.ok(syncResult);
    }

    /**
     * Deactivates and clears the currently stored commercial license token.
     *
     * @param httpRequest Servlet request for audit IP extraction
     * @return Updated {@link LicenseStatusDTO}
     */
    @DeleteMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Deactivate stored license (ADMIN)", description = "Removes the currently active commercial license token while preserving clock tamper protection.")
    @ApiResponse(responseCode = "200", description = "License deactivated successfully")
    public ResponseEntity<LicenseStatusDTO> deactivateLicense(HttpServletRequest httpRequest) {
        User actor = resolveCurrentUser();
        LicenseStatusDTO result = licenseService.deactivateLicense();
        auditLogService.logAction(
                actor,
                "DEACTIVATE_LICENSE",
                ENTITY_LICENSE,
                1L,
                "Cleared stored commercial license token",
                resolveClientIp(httpRequest)
        );
        return ResponseEntity.ok(result);
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
