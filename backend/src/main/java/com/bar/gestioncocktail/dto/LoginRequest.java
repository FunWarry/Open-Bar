package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO de requête contenant les identifiants d'authentification pour la connexion.
 */
@Data
@Schema(description = "Requête d'authentification utilisateur")
public class LoginRequest {

    /**
     * Nom d'utilisateur unique.
     */
    @NotBlank(message = "Le nom d'utilisateur est requis")
    @Schema(description = "Nom d'utilisateur", example = "admin")
    private String username;

    /**
     * Mot de passe du compte.
     */
    @NotBlank(message = "Le mot de passe est requis")
    @Schema(description = "Mot de passe", example = "password123")
    private String password;
}