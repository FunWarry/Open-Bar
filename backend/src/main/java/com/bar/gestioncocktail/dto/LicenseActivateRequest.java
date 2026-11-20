package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.security.NoSanitize;
import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for manually activating an offline JWT-signed license key.
 *
 * @param licenseToken Compact signed JWT license token
 */
public record LicenseActivateRequest(
    @NoSanitize
    @NotBlank(message = "License token is required")
    String licenseToken
) {
}
