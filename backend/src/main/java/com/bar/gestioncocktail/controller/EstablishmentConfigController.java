package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EstablishmentConfigDTO;
import com.bar.gestioncocktail.dto.EstablishmentConfigUpdateRequest;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for managing legal establishment configuration parameters.
 */
@Tag(name = "Establishment Legal Config", description = "Endpoints for retrieving and updating legal establishment settings (SIRET, TVA, RCS, Address)")
@RestController
@RequestMapping("/api/admin/establishment")
public class EstablishmentConfigController {

    private final EstablishmentConfigService establishmentConfigService;

    public EstablishmentConfigController(EstablishmentConfigService establishmentConfigService) {
        this.establishmentConfigService = establishmentConfigService;
    }

    @Operation(summary = "Get legal establishment configuration", description = "Retrieves current legal parameters of the establishment.")
    @ApiResponse(responseCode = "200", description = "Configuration retrieved successfully")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<EstablishmentConfigDTO> getConfig() {
        return ResponseEntity.ok(establishmentConfigService.getConfigDTO());
    }

    @Operation(summary = "Update legal establishment configuration", description = "Updates legal settings (SIRET, TVA, RCS, address) for invoices and receipts.")
    @ApiResponse(responseCode = "200", description = "Configuration updated successfully")
    @ApiResponse(responseCode = "400", description = "Validation failed or invalid SIRET Luhn check")
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EstablishmentConfigDTO> updateConfig(@Valid @RequestBody EstablishmentConfigUpdateRequest request) {
        return ResponseEntity.ok(establishmentConfigService.updateConfig(request));
    }
}
