package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO on successful authentication.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Authentication response containing tokens and user information")
public class LoginResponse {

    /**
     * JWT access token for authenticating subsequent requests (Bearer).
     */
    @Schema(description = "JWT access token (Bearer)")
    private String token;

    /**
     * Refresh token UUID to obtain new access tokens.
     */
    @Schema(description = "Refresh token UUID")
    private String refreshToken;

    /**
     * Authenticated username.
     */
    @Schema(description = "Username")
    private String username;

    /**
     * Assigned roles (e.g. ROLE_ADMIN, ROLE_BARMAN, etc.).
     */
    @Schema(description = "Roles assigned to user")
    private List<String> roles;

    /**
     * User email address.
     */
    @Schema(description = "Email address")
    private String email;

    /**
     * Account creation timestamp.
     */
    private LocalDateTime createdAt;

    /**
     * Account last modification timestamp.
     */
    private LocalDateTime updatedAt;
}