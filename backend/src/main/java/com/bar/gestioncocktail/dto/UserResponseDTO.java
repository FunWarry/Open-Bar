package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import java.time.LocalDateTime;
import java.util.Set;

public record UserResponseDTO(
    Long id,
    String username,
    String email,
    String nom,
    String prenom,
    Set<UserRole> roles,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static UserResponseDTO from(User user) {
        return new UserResponseDTO(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getNom(),
            user.getPrenom(),
            user.getRoles(),
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }
}
