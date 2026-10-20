package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO on successful authentication.
 */
@Data
@NoArgsConstructor
@Schema(description = "Authentication response containing tokens and user information")
public class LoginResponse {

    /**
     * Unique identifier of the authenticated user.
     */
    @Schema(description = "User unique identifier")
    private Long id;

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

    /**
     * All-arguments constructor for LoginResponse.
     *
     * @param id User unique identifier
     * @param token JWT access token
     * @param refreshToken Refresh token UUID
     * @param username Authenticated username
     * @param roles Assigned roles
     * @param email User email address
     * @param createdAt Account creation timestamp
     * @param updatedAt Account last modification timestamp
     */
    public LoginResponse(Long id, String token, String refreshToken, String username, List<String> roles,
                         String email, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.token = token;
        this.refreshToken = refreshToken;
        this.username = username;
        this.roles = roles;
        this.email = email;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /**
     * Legacy constructor for backwards-compatibility without explicit user id.
     *
     * @param token JWT access token
     * @param refreshToken Refresh token UUID
     * @param username Authenticated username
     * @param roles Assigned roles
     * @param email User email address
     * @param createdAt Account creation timestamp
     * @param updatedAt Account last modification timestamp
     */
    public LoginResponse(String token, String refreshToken, String username, List<String> roles,
                         String email, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this(null, token, refreshToken, username, roles, email, createdAt, updatedAt);
    }
}