package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.SafetyAlertResolveRequestDTO;
import com.bar.gestioncocktail.dto.SafetyAlertResponseDTO;
import com.bar.gestioncocktail.service.PdfService;
import com.bar.gestioncocktail.service.SafetyAlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for staff supervision, management, and resolution of Angel Shot patron safety alerts,
 * as well as printable restroom safety notice PDF generation.
 */
@RestController
@RequestMapping("/api/safety-alerts")
@Tag(name = "Safety Alerts", description = "Angel Shot patron safety protocol supervision and emergency dispatching")
public class SafetyAlertController {

    private final SafetyAlertService safetyAlertService;
    private final PdfService pdfService;

    /**
     * Constructs SafetyAlertController with required service dependencies.
     *
     * @param safetyAlertService Service handling safety alert operations
     * @param pdfService         Service generating printable PDF notices
     */
    public SafetyAlertController(SafetyAlertService safetyAlertService, PdfService pdfService) {
        this.safetyAlertService = safetyAlertService;
        this.pdfService = pdfService;
    }

    /**
     * Retrieves all active safety alerts requiring staff attendance.
     *
     * @return List of unacknowledged safety alert response DTOs
     */
    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR', 'BARMAN')")
    @Operation(summary = "List active safety alerts", description = "Retrieves all currently active, unresolved Angel Shot alerts across the establishment.")
    @ApiResponse(responseCode = "200", description = "Active safety alerts retrieved successfully")
    public List<SafetyAlertResponseDTO> getActiveAlerts() {
        return safetyAlertService.getActiveAlerts();
    }

    /**
     * Retrieves active safety alerts for a specific table.
     *
     * @param tableId Table primary key
     * @return List of active safety alerts for the table
     */
    @GetMapping("/tables/{tableId:\\d+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR', 'BARMAN')")
    @Operation(summary = "Get active safety alerts for table", description = "Retrieves active Angel Shot alerts associated with a specific table.")
    @ApiResponse(responseCode = "200", description = "Active alerts for table retrieved")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public List<SafetyAlertResponseDTO> getActiveAlertsForTable(
            @Parameter(description = "Table ID", example = "3") @PathVariable Long tableId
    ) {
        return safetyAlertService.getActiveAlertsForTable(tableId);
    }

    /**
     * Acknowledges and marks an active safety alert as resolved.
     *
     * @param id             Alert identifier
     * @param resolveDTO     Optional resolve details
     * @param authentication Authenticated user context
     * @return Resolved safety alert DTO
     */
    @PutMapping("/{id:\\d+}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR', 'BARMAN')")
    @Operation(summary = "Resolve a safety alert", description = "Marks an active emergency alert as resolved and attended by staff.")
    @ApiResponse(responseCode = "200", description = "Safety alert resolved successfully")
    @ApiResponse(responseCode = "404", description = "Safety alert not found")
    public ResponseEntity<SafetyAlertResponseDTO> resolveAlert(
            @Parameter(description = "Safety alert ID", example = "12") @PathVariable Long id,
            @Valid @RequestBody(required = false) SafetyAlertResolveRequestDTO resolveDTO,
            Authentication authentication
    ) {
        String resolvedBy;
        if (resolveDTO != null && resolveDTO.resolvedBy() != null && !resolveDTO.resolvedBy().isBlank()) {
            resolvedBy = resolveDTO.resolvedBy();
        } else if (authentication != null) {
            resolvedBy = authentication.getName();
        } else {
            resolvedBy = "Staff";
        }

        SafetyAlertResponseDTO response = safetyAlertService.resolveAlert(id, resolvedBy);
        return ResponseEntity.ok(response);
    }

    /**
     * Generates and downloads a printable A4 bilingual Angel Shot restroom notice PDF for framing.
     *
     * @return PDF binary payload
     */
    @GetMapping(value = "/poster/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Download printable restroom safety notice PDF", description = "Generates an A4 PDF notice explaining the Angel Shot protocol for framing in restrooms.")
    @ApiResponse(responseCode = "200", description = "PDF notice generated successfully")
    public ResponseEntity<byte[]> getRestroomNoticePdf() {
        byte[] pdfBytes = pdfService.generateAngelShotNoticePdf();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"angel-shot-notice.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}
