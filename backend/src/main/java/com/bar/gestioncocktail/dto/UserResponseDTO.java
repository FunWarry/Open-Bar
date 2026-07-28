package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * DTO de réponse contenant les informations publiques d'un utilisateur.
 *
 * @param id Identifiant unique
 * @param username Nom d'utilisateur
 * @param email Adresse email
 * @param nom Nom de famille
 * @param prenom Prénom
 * @param roles Ensemble des rôles attribués
 * @param createdAt Date de création du compte
 * @param updatedAt Date de dernière mise à jour
 */
@Schema(description = "Représentation sécurisée d'un profil utilisateur")
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
    /**
     * Convertit une entité {@link User} en DTO de réponse.
     *
     * @param user L'entité utilisateur
     * @return Le DTO correspondant
     */
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
