package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.security.NoSanitize;
import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO containing a JWT refresh token.
 *
 * @param refreshToken Opaque refresh token string
 */
public record RefreshTokenRequest(
    @NotBlank(message = "Refresh token is required")
    @NoSanitize
    String refreshToken
) {}

