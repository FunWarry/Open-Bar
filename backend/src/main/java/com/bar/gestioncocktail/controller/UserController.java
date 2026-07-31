package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.UserRequestDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST pour la gestion des comptes utilisateurs, rôles (ADMIN, MANAGER, SERVEUR, BARMAN) et mots de passe.
 */
@RestController
@RequestMapping("/api/users")
@Tag(name = "Utilisateurs", description = "Administration des comptes utilisateurs, attribution des rôles et réinitialisation de mot de passe")
public class UserController {
    private final UserService userService;

    /**
     * Constructs the controller with the user service dependency.
     *
     * @param userService Service for user account management
     */
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Retrieves all user accounts.
     *
     * @return List of all user DTOs
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all users (ADMIN)", description = "Retrieves all registered user accounts.")
    @ApiResponse(responseCode = "200", description = "List of users retrieved")
    public ResponseEntity<List<UserResponseDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers().stream()
            .map(UserResponseDTO::from)
            .toList());
    }

    /**
     * Creates a new user account.
     *
     * @param request Data for the user to create
     * @return DTO of the created user
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a user (ADMIN)")
    @ApiResponse(responseCode = "200", description = "User created")
    @ApiResponse(responseCode = "403", description = "Access restricted to administrators")
    public ResponseEntity<UserResponseDTO> createUser(@RequestBody UserRequestDTO request) {
        return ResponseEntity.ok(UserResponseDTO.from(userService.createUser(request.toEntity())));
    }

    /**
     * Updates an existing user account.
     *
     * @param id Identifier of the user
     * @param request Updated user data
     * @return Updated DTO
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a user (ADMIN)")
    @ApiResponse(responseCode = "200", description = "User updated")
    public ResponseEntity<UserResponseDTO> updateUser(
        @Parameter(description = "User ID") @PathVariable Long id,
        @RequestBody UserRequestDTO request) {
        User user = request.toEntity();
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
