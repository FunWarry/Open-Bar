package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.security.NoSanitize;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * Request DTO for creating a new user account.
 *
 * @param username Unique login name for the user
 * @param password Plain-text password (will be encoded by the service)
 * @param email Unique email address
 * @param nom Last name
 * @param prenom First name
 * @param roles Set of roles to assign to the user
 */
public record UserRequestDTO(
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    String username,

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    @NoSanitize
    String password,

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @Size(max = 100, message = "Email cannot exceed 100 characters")
    String email,

    @Size(max = 50, message = "Last name cannot exceed 50 characters")
    String nom,

    @Size(max = 50, message = "First name cannot exceed 50 characters")
    String prenom,

    Set<UserRole> roles
) {
    /**
     * Converts this DTO into a {@link User} JPA entity.
     *
     * @return A new {@link User} entity instance with the given attributes
     */
    public User toEntity() {
        User user = new User();
        user.setUsername(username);
        user.setPassword(password);
        user.setEmail(email);
        user.setNom(nom);
        user.setPrenom(prenom);
        if (roles != null) {
            user.setRoles(roles);
        }
        return user;
    }
}
