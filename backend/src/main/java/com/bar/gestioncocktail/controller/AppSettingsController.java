package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.AppSettingsResponseDTO;
import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.TimeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    private final TimeService timeService;

    /**
     * Constructs the controller with settings service and time service dependencies.
     *
     * @param appSettingsService Application settings service
     * @param timeService Application time service for establishment timezone resolution
     */
    @Autowired
    public AppSettingsController(AppSettingsService appSettingsService, TimeService timeService) {
        this.appSettingsService = appSettingsService;
        this.timeService = timeService;
    }

    /**
     * Retrieves current application settings.
     *
     * @return Establishment settings DTO
     */
    @GetMapping
    @Operation(summary = "Get establishment settings", description = "Public endpoint to retrieve establishment branding and alert thresholds. Sensitive fields are redacted for unauthenticated callers.")
    @ApiResponse(responseCode = "200", description = "Settings retrieved successfully")
    public ResponseEntity<AppSettingsResponseDTO> getSettings() {
        String tz = (timeService != null && timeService.getZoneId() != null)
                ? timeService.getZoneId().getId()
                : AppSettingsResponseDTO.DEFAULT_TIMEZONE;
        AppSettingsResponseDTO dto = AppSettingsResponseDTO.from(appSettingsService.getSettings(), tz);
        if (isAnonymousCaller()) {
            dto = dto.redactForPublic();
        }
        return ResponseEntity.ok(dto);
    }

    private boolean isAnonymousCaller() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof AnonymousAuthenticationToken) {
            return true;
        }
        return auth != null && auth.getAuthorities() != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ANONYMOUS".equals(a.getAuthority()));
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
        @Parameter(description = "Format: PNG or SVG") @RequestParam(defaultValue = "PNG") String format,
        @Parameter(description = "Image size in pixels") @RequestParam(defaultValue = "300") int size) {
        byte[] qrBytes = appSettingsService.generateWifiQrCode(format, size);
        String cleanFormat = format != null ? format.toLowerCase() : "png";
        MediaType mediaType = "svg".equalsIgnoreCase(cleanFormat)
            ? MediaType.valueOf("image/svg+xml")
            : MediaType.IMAGE_PNG;

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"wifi-qrcode." + cleanFormat + "\"")
            .contentType(mediaType)
            .body(qrBytes);
    }
}
