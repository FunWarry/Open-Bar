package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO de réponse lors d'une authentification réussie.
 */
@Data
@AllArgsConstructor
@Schema(description = "Réponse d'authentification contenant les tokens et les données utilisateur")
public class LoginResponse {

    /**
     * Access token JWT pour authentifier les requêtes subséquentes.
     */
    @Schema(description = "Access token JWT (Bearer)")
    private String token;

    /**
     * Token de rafraîchissement permettant d'obtenir un nouvel access token.
     */
    @Schema(description = "Refresh token UUID")
    private String refreshToken;

    /**
     * Nom d'utilisateur connecté.
     */
    @Schema(description = "Nom d'utilisateur")
    private String username;

    /**
     * Liste des rôles attribués (ex: ROLE_ADMIN, ROLE_BARMAN, etc.).
     */
    @Schema(description = "Rôles attribués à l'utilisateur")
    private List<String> roles;

    /**
     * Adresse email de l'utilisateur.
     */
    @Schema(description = "Adresse email")
    private String email;

    /**
     * Date de création du compte.
     */
    private LocalDateTime createdAt;

    /**
     * Date de dernière modification du compte.
     */
    private LocalDateTime updatedAt;
}