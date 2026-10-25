package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.SafetyAlertRequestDTO;
import com.bar.gestioncocktail.dto.SafetyAlertResponseDTO;
import com.bar.gestioncocktail.service.SafetyAlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public REST controller allowing patrons to trigger silent Angel Shot safety alerts
 * directly and anonymously from their table via the QR code menu.
 */
@RestController
@RequestMapping("/api/public/safety-alerts")
@Tag(name = "Public Safety Alerts", description = "Anonymous patron emergency assistance calls from QR code menu")
public class PublicSafetyAlertController {

    private final SafetyAlertService safetyAlertService;

    /**
     * Constructs PublicSafetyAlertController with required safety alert service.
     *
     * @param safetyAlertService Service handling safety alert operations
     */
    public PublicSafetyAlertController(SafetyAlertService safetyAlertService) {
        this.safetyAlertService = safetyAlertService;
    }

    /**
     * Triggers a silent Angel Shot emergency assistance alert for a table without requiring authentication.
     *
     * @param tableId    Table identifier
     * @param requestDTO Alert request parameters (type: NEAT, ICE, LIME; optional comment)
     * @return Created safety alert response DTO
     */
    @PostMapping("/tables/{tableId:\\d+}")
    @Operation(summary = "Trigger silent Angel Shot safety alert", description = "Dispatches a silent emergency assistance request to staff tablets.")
    @ApiResponse(responseCode = "201", description = "Safety alert triggered and dispatched successfully")
    @ApiResponse(responseCode = "400", description = "Safety protocol module disabled or invalid request")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<SafetyAlertResponseDTO> triggerSafetyAlert(
            @Parameter(description = "Table ID", example = "4") @PathVariable Long tableId,
            @Valid @RequestBody(required = false) SafetyAlertRequestDTO requestDTO
    ) {
        SafetyAlertRequestDTO effectiveRequest = requestDTO != null ? requestDTO : new SafetyAlertRequestDTO();
        SafetyAlertResponseDTO response = safetyAlertService.createAlert(tableId, effectiveRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
