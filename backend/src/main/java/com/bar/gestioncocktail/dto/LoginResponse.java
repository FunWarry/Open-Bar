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
     * Constructor for LoginResponse with core user and token details (7 parameters).
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
        this.token = token;
        this.refreshToken = refreshToken;
        this.username = username;
        this.roles = roles;
        this.email = email;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /**
     * Factory method creating a LoginResponse from user entity, tokens, and roles.
     *
     * @param user Authenticated user entity
     * @param token JWT access token
     * @param refreshToken Refresh token UUID
     * @param roles Assigned roles
     * @return Fully populated LoginResponse instance
     */
    public static LoginResponse of(com.bar.gestioncocktail.model.User user, String token, String refreshToken, List<String> roles) {
        LoginResponse response = new LoginResponse(
                token,
                refreshToken,
                user.getUsername(),
                roles,
                user.getEmail(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
        response.setId(user.getId());
        return response;
    }

    /**
     * Fluent setter for user unique identifier.
     *
     * @param id Unique user identifier
     * @return This response instance
     */
    public LoginResponse withId(Long id) {
        this.id = id;
        return this;
    }
}