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
import org.springframework.beans.factory.annotation.Autowired;
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
    private final com.bar.gestioncocktail.service.TimeService timeService;

    /**
     * Constructs the controller with settings service and time service dependencies.
     *
     * @param appSettingsService Application settings service
     * @param timeService Application time service for establishment timezone resolution
     */
    @Autowired
    public AppSettingsController(AppSettingsService appSettingsService, com.bar.gestioncocktail.service.TimeService timeService) {
        this.appSettingsService = appSettingsService;
        this.timeService = timeService;
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
        String tz = (timeService != null && timeService.getZoneId() != null)
                ? timeService.getZoneId().getId()
                : AppSettingsResponseDTO.DEFAULT_TIMEZONE;
        return ResponseEntity.ok(AppSettingsResponseDTO.from(appSettingsService.getSettings(), tz));
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
        String tz = (timeService != null && timeService.getZoneId() != null)
                ? timeService.getZoneId().getId()
                : AppSettingsResponseDTO.DEFAULT_TIMEZONE;
        return ResponseEntity.ok(AppSettingsResponseDTO.from(appSettingsService.updateSettings(request), tz));
    }

    /**
     * Generates establishment Wi-Fi network configuration pairing QR code (PNG or SVG).
     *
     * @param format Output format (PNG or SVG)
     * @param size Dimension in pixels
     * @return Generated image binary content
     */
    @GetMapping("/wifi/qrcode")
    @Operation(summary = "Generate Wi-Fi connection pairing QR code (PNG or SVG)")
    @ApiResponse(responseCode = "200", description = "Wi-Fi QR code generated successfully")
    @ApiResponse(responseCode = "400", description = "Wi-Fi SSID is not configured")
    public ResponseEntity<byte[]> getWifiQrCode(
        @io.swagger.v3.oas.annotations.Parameter(description = "Format: PNG or SVG") @org.springframework.web.bind.annotation.RequestParam(defaultValue = "PNG") String format,
        @io.swagger.v3.oas.annotations.Parameter(description = "Image size in pixels") @org.springframework.web.bind.annotation.RequestParam(defaultValue = "300") int size) {
        byte[] qrBytes = appSettingsService.generateWifiQrCode(format, size);
        String cleanFormat = format != null ? format.toLowerCase() : "png";
        org.springframework.http.MediaType mediaType = "svg".equalsIgnoreCase(cleanFormat)
            ? org.springframework.http.MediaType.valueOf("image/svg+xml")
            : org.springframework.http.MediaType.IMAGE_PNG;

        return ResponseEntity.ok()
            .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"wifi-qrcode." + cleanFormat + "\"")
            .contentType(mediaType)
            .body(qrBytes);
    }
}
