package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.security.NoSanitize;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for initial administrator account creation during setup.
 *
 * @param username Administrator username
 * @param email Administrator email address
 * @param password Administrator raw password
 * @param nom Last name
 * @param prenom First name
 */
public record CreateAdminRequestDTO(
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    String username,

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    @NoSanitize
    String password,

    @Size(max = 50, message = "Last name cannot exceed 50 characters")
    String nom,

    @Size(max = 50, message = "First name cannot exceed 50 characters")
    String prenom
) {}
