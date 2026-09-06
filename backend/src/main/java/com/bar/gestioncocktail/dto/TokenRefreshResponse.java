package com.bar.gestioncocktail.dto;
/**
 * Response DTO returned upon successful refresh token exchange containing new JWT access tokens.
 */

public record TokenRefreshResponse(String accessToken, String refreshToken, String tokenType) {
    public TokenRefreshResponse(String accessToken, String refreshToken) {
        this(accessToken, refreshToken, "Bearer");
    }
}
