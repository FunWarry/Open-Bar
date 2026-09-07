package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EstablishmentModulesDTO;
import com.bar.gestioncocktail.dto.EstablishmentModulesUpdateRequest;
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
 * REST controller for retrieving and updating modular establishment capabilities and feature flags.
 * <p>
 * The {@code GET} endpoint is public to allow unauthenticated patrons and initial setup wizards
 * to discover active capabilities. The {@code PUT} endpoint is restricted to Administrators and Managers.
 */
@Tag(name = "Establishment Modules", description = "Endpoints for managing active modular capabilities and feature flags")
@RestController
@RequestMapping("/api/establishment/modules")
public class EstablishmentModulesController {

    private final EstablishmentConfigService establishmentConfigService;

    /**
     * Constructs EstablishmentModulesController with the configuration service.
     *
     * @param establishmentConfigService Service managing establishment configurations and modules
     */
    public EstablishmentModulesController(EstablishmentConfigService establishmentConfigService) {
        this.establishmentConfigService = establishmentConfigService;
    }

    /**
     * Retrieves the current configuration of active establishment modules.
     *
     * @return DTO representing active capability flags
     */
    @Operation(summary = "Get establishment capability modules", description = "Public endpoint returning whether KDS, Happy Hour, Employee Shifts, Floor Plan, QR ordering, and Stock tracking are enabled.")
    @ApiResponse(responseCode = "200", description = "Capability modules configuration retrieved successfully")
    @GetMapping
    public ResponseEntity<EstablishmentModulesDTO> getModules() {
        return ResponseEntity.ok(establishmentConfigService.getModulesDTO());
    }

    /**
     * Updates modular capabilities configuration.
     *
     * @param request Update payload containing desired module states
     * @return Updated capability modules DTO
     */
    @Operation(summary = "Update establishment capability modules", description = "Restricted to ADMIN and MANAGER roles. Updates active module flags and notifies clients via WebSocket.")
    @ApiResponse(responseCode = "200", description = "Capability modules updated successfully")
    @ApiResponse(responseCode = "403", description = "Access denied - ADMIN or MANAGER role required")
    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<EstablishmentModulesDTO> updateModules(@Valid @RequestBody EstablishmentModulesUpdateRequest request) {
        return ResponseEntity.ok(establishmentConfigService.updateModules(request));
    }
}
