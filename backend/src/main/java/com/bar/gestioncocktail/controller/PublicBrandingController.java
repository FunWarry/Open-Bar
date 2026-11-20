package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.relay.PublicBrandingDTO;
import com.bar.gestioncocktail.service.relay.CloudRelayTunnelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public REST controller exposing safe white-label venue branding and Cloud Relay
 * offline fallback information for patrons and login pages.
 */
@RestController
@RequestMapping("/api/public")
@Tag(name = "Public White-Label Branding", description = "Public venue branding, theme tokens, and Wi-Fi fallback metadata")
public class PublicBrandingController {

    private final CloudRelayTunnelService tunnelService;

    /**
     * Constructs PublicBrandingController with the tunnel/branding service.
     *
     * @param tunnelService Cloud Relay tunnel and branding service
     */
    public PublicBrandingController(CloudRelayTunnelService tunnelService) {
        this.tunnelService = tunnelService;
    }

    /**
     * Retrieves public-safe white-label venue branding (name, logo, banner, colors, effective URL).
     *
     * @return {@link PublicBrandingDTO}
     */
    @GetMapping("/branding")
    @Operation(summary = "Get public venue white-label branding", description = "Returns public-safe branding tokens and tunnel availability status.")
    @ApiResponse(responseCode = "200", description = "Public branding retrieved")
    public ResponseEntity<PublicBrandingDTO> getPublicBranding() {
        return ResponseEntity.ok(tunnelService.getPublicBranding());
    }

    /**
     * Retrieves Cloud Relay tunnel health and local Wi-Fi fallback instructions.
     *
     * @return {@link PublicBrandingDTO} containing tunnelConnected flag and Wi-Fi SSID
     */
    @GetMapping("/cloud-relay/health")
    @Operation(summary = "Get Cloud Relay health & Wi-Fi fallback info", description = "Returns tunnel connectivity flag and local Wi-Fi SSID for graceful fallback screens.")
    @ApiResponse(responseCode = "200", description = "Health and fallback metadata retrieved")
    public ResponseEntity<PublicBrandingDTO> getRelayHealth() {
        return ResponseEntity.ok(tunnelService.getPublicBranding());
    }
}
