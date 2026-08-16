package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.AppSettingsResponseDTO;
import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.service.AppSettingsService;
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
 * REST controller for global application settings (branding, theme customization, alert thresholds).
 * <p>
 * The {@code GET} endpoint is public to enable reading establishment parameters on the login screen.
 * The {@code PUT} endpoint is restricted to administrators and managers.
 */
@RestController
@RequestMapping("/api/settings")
@Tag(name = "Settings", description = "Global establishment settings and customization")
public class AppSettingsController {

    private final AppSettingsService appSettingsService;

    /**
     * Constructs the controller with the settings service dependency.
     *
     * @param appSettingsService Application settings service
     */
    public AppSettingsController(AppSettingsService appSettingsService) {
        this.appSettingsService = appSettingsService;
    }

    /**
     * Retrieves current application settings.
     *
     * @return Establishment settings DTO
     */
    @GetMapping
    @Operation(summary = "Get establishment settings", description = "Public endpoint to retrieve establishment branding and alert thresholds.")
    @ApiResponse(responseCode = "200", description = "Settings retrieved successfully")
    public ResponseEntity<AppSettingsResponseDTO> getSettings() {
        return ResponseEntity.ok(AppSettingsResponseDTO.from(appSettingsService.getSettings()));
    }

    /**
     * Updates establishment settings.
     *
     * @param request New settings payload
     * @return Updated settings DTO
     */
    @PutMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Update settings (ADMIN/MANAGER)", description = "Updates establishment name, alert thresholds, and branding.")
    @ApiResponse(responseCode = "200", description = "Settings updated successfully")
    @ApiResponse(responseCode = "403", description = "Access denied - ADMIN or MANAGER role required")
    public ResponseEntity<AppSettingsResponseDTO> updateSettings(@Valid @RequestBody AppSettingsUpdateRequest request) {
        return ResponseEntity.ok(AppSettingsResponseDTO.from(appSettingsService.updateSettings(request)));
    }
}
