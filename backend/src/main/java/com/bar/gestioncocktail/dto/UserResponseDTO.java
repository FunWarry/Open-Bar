package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * Response DTO containing public profile information of a user.
 *
 * @param id Unique identifier
 * @param username Username
 * @param email Email address
 * @param nom Last name
 * @param prenom First name
 * @param roles Set of assigned user roles
 * @param remoteAccessEnabled Whether this user is permitted to access OpenBar via the Cloud Relay tunnel
 * @param createdAt Account creation timestamp
 * @param updatedAt Account last modification timestamp
 */
@Schema(description = "Secure representation of a user profile")
public record UserResponseDTO(
    Long id,
    String username,
    String email,
    String nom,
    String prenom,
    Set<UserRole> roles,
    Boolean remoteAccessEnabled,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Backward-compatible 8-parameter constructor before per-user Cloud Relay access control.
     */
    public UserResponseDTO(
        Long id,
        String username,
        String email,
        String nom,
        String prenom,
        Set<UserRole> roles,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(id, username, email, nom, prenom, roles, Boolean.TRUE, createdAt, updatedAt);
    }

    /**
     * Converts a {@link User} entity into a response DTO.
     *
     * @param user Source user entity
     * @return Corresponding response DTO
     */
    public static UserResponseDTO from(User user) {
        return new UserResponseDTO(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getNom(),
            user.getPrenom(),
            user.getRoles(),
            user.getRemoteAccessEnabled(),
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }
}
