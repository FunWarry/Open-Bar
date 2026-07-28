package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST pour la gestion des comptes utilisateurs, rôles (ADMIN, MANAGER, SERVEUR, BARMAN) et mots de passe.
 */
@RestController
@RequestMapping("/api/users")
@SuppressWarnings({"java:S4684", "java:S5122"})
@Tag(name = "Utilisateurs", description = "Administration des comptes utilisateurs, attribution des rôles et réinitialisation de mot de passe")
public class UserController {
    private final UserService userService;

    /**
     * Constructeur avec injection du service utilisateur.
     *
     * @param userService Service de gestion des comptes
     */
    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Crée un compte utilisateur.
     *
     * @param user Données de l'utilisateur à créer
     * @return DTO de l'utilisateur créé
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer un utilisateur (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Utilisateur créé")
    @ApiResponse(responseCode = "403", description = "Accès réservé aux administrateurs")
    public ResponseEntity<UserResponseDTO> createUser(@RequestBody User user) {
        return ResponseEntity.ok(UserResponseDTO.from(userService.createUser(user)));
    }

    /**
     * Met à jour les informations d'un utilisateur.
     *
     * @param id Identifiant de l'utilisateur
     * @param user Données modifiées
     * @return DTO mis à jour
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour un utilisateur (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Utilisateur mis à jour")
    public ResponseEntity<UserResponseDTO> updateUser(
        @Parameter(description = "ID de l'utilisateur") @PathVariable Long id,
        @RequestBody User user) {
        user.setId(id);
        return ResponseEntity.ok(UserResponseDTO.from(userService.updateUser(user)));
    }

    /**
     * Supprime un utilisateur.
     *
     * @param id Identifiant de l'utilisateur
     * @return Statut 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un utilisateur (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Utilisateur supprimé")
    public ResponseEntity<Void> deleteUser(@Parameter(description = "ID de l'utilisateur") @PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Récupère un utilisateur par son identifiant.
     *
     * @param id Identifiant
     * @return DTO de l'utilisateur
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Obtenir un utilisateur par son ID")
    @ApiResponse(responseCode = "200", description = "Utilisateur trouvé")
    @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    public ResponseEntity<UserResponseDTO> getUserById(@Parameter(description = "ID de l'utilisateur") @PathVariable Long id) {
        return userService.getUserById(id)
            .map(UserResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Récupère un utilisateur par son nom d'utilisateur.
     *
     * @param username Nom d'utilisateur
     * @return DTO de l'utilisateur
     */
    @GetMapping("/username/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Obtenir un utilisateur par son username (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Utilisateur trouvé")
    public ResponseEntity<UserResponseDTO> getUserByUsername(@PathVariable String username) {
        return userService.getUserByUsername(username)
            .map(UserResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Liste les utilisateurs possédant un rôle donné (ADMIN, MANAGER, SERVEUR, BARMAN).
     *
     * @param role Le rôle recherché
     * @return Liste des utilisateurs
     */
    @GetMapping("/role/{role}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lister les utilisateurs par rôle (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Liste des utilisateurs")
    public ResponseEntity<List<UserResponseDTO>> getUsersByRole(@PathVariable UserRole role) {
        return ResponseEntity.ok(userService.getUsersByRole(role).stream()
            .map(UserResponseDTO::from).toList());
    }

    /**
     * Vérifie la disponibilité d'un nom d'utilisateur (endpoint public pour validation lors de l'inscription).
     *
     * @param username Nom d'utilisateur à tester
     * @return True si le nom d'utilisateur est déjà pris, false sinon
     */
    @GetMapping("/check-username/{username}")
    @Operation(summary = "Vérifier la disponibilité d'un username", description = "Accès public pour contrôle d'unicité.")
    @ApiResponse(responseCode = "200", description = "Résultat du contrôle d'unicité")
    public ResponseEntity<Boolean> checkUsernameExists(@PathVariable String username) {
        return ResponseEntity.ok(userService.existsByUsername(username));
    }

    /**
     * Vérifie la disponibilité d'une adresse email.
     *
     * @param email Adresse email à tester
     * @return True si l'email existe déjà
     */
    @GetMapping("/check-email/{email}")
    @Operation(summary = "Vérifier la disponibilité d'un email", description = "Accès public pour contrôle d'unicité.")
    @ApiResponse(responseCode = "200", description = "Résultat du contrôle d'unicité")
    public ResponseEntity<Boolean> checkEmailExists(@PathVariable String email) {
        return ResponseEntity.ok(userService.existsByEmail(email));
    }

    /**
     * Modifie le mot de passe d'un utilisateur.
     *
     * @param id Identifiant de l'utilisateur
     * @param newPassword Nouveau mot de passe
     * @return Statut 200 OK
     */
    @PutMapping("/{id}/password")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Changer le mot de passe d'un utilisateur")
    @ApiResponse(responseCode = "200", description = "Mot de passe modifié")
    public ResponseEntity<Void> changePassword(
        @PathVariable Long id,
        @RequestBody String newPassword) {
        userService.getUserById(id).ifPresent(user -> userService.changePassword(user, newPassword));
        return ResponseEntity.ok().build();
    }
}
