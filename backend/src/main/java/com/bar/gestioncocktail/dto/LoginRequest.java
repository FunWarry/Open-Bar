package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request DTO containing user credentials for authentication.
 */
@Data
@Schema(description = "User authentication request payload")
public class LoginRequest {

    /**
     * Unique username.
     */
    @NotBlank(message = "Username is required")
    @Schema(description = "Username", example = "admin")
    private String username;

    /**
     * Account password.
     */
    @NotBlank(message = "Password is required")
    @Schema(description = "Password", example = "password123")
    private String password;
}