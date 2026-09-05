package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.UserRequestDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
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
 * REST controller for managing user accounts, roles (ADMIN, MANAGER, SERVEUR, BARMAN), and passwords.
 */
@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "User account administration, role assignment, and password management")
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
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Get all users (ADMIN, MANAGER)", description = "Retrieves all registered user accounts.")
    @ApiResponse(responseCode = "200", description = "List of users retrieved")
    public ResponseEntity<List<UserResponseDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers().stream()
            .map(UserResponseDTO::from)
            .toList());
    }

    /**
     * Retrieves paginated user accounts with optional search and role filtering.
     *
     * @param page Page index (default 0)
     * @param size Page size (default 10)
     * @param search Search keyword for username, email, nom, prenom
     * @param role Filter by user role (ADMIN, MANAGER, SERVEUR, BARMAN)
     * @return Paginated user response DTO
     */
    @GetMapping("/paged")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Get paginated users (ADMIN, MANAGER)", description = "Retrieves paginated users with optional search and role filtering.")
    @ApiResponse(responseCode = "200", description = "Paginated users retrieved")
    public ResponseEntity<com.bar.gestioncocktail.dto.PageResponseDTO<UserResponseDTO>> getUsersPaged(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String role) {
        return ResponseEntity.ok(userService.getUsersPaged(page, size, search, role));
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
        return ResponseEntity.ok(UserResponseDTO.from(userService.updateUser(id, request.toEntity())));
    }

    /**
     * Deletes a user account.
     *
     * @param id User identifier
     * @return HTTP 200 OK
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a user (ADMIN)")
    @ApiResponse(responseCode = "200", description = "User deleted")
    public ResponseEntity<Void> deleteUser(@Parameter(description = "User ID") @PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Retrieves a user by identifier.
     *
     * @param id User identifier
     * @return User DTO
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Get user by ID")
    @ApiResponse(responseCode = "200", description = "User found")
    @ApiResponse(responseCode = "404", description = "User not found")
    public ResponseEntity<UserResponseDTO> getUserById(@Parameter(description = "User ID") @PathVariable Long id) {
        return userService.getUserById(id)
            .map(UserResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Retrieves a user by username.
     *
     * @param username Username
     * @return User DTO
     */
    @GetMapping("/username/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get user by username (ADMIN)")
    @ApiResponse(responseCode = "200", description = "User found")
    public ResponseEntity<UserResponseDTO> getUserByUsername(@PathVariable String username) {
        return userService.getUserByUsername(username)
            .map(UserResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Lists users matching a specific role (ADMIN, MANAGER, SERVEUR, BARMAN).
     *
     * @param role Target role
     * @return List of matching users
     */
    @GetMapping("/role/{role}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List users by role (ADMIN)")
    @ApiResponse(responseCode = "200", description = "List of users")
    public ResponseEntity<List<UserResponseDTO>> getUsersByRole(@PathVariable UserRole role) {
        return ResponseEntity.ok(userService.getUsersByRole(role).stream()
            .map(UserResponseDTO::from).toList());
    }

    /**
     * Checks username availability (public endpoint for signup/creation validation).
     *
     * @param username Username to test
     * @return True if username is already taken, false otherwise
     */
    @GetMapping("/check-username/{username}")
    @Operation(summary = "Check username availability", description = "Public endpoint for uniqueness verification.")
    @ApiResponse(responseCode = "200", description = "Uniqueness check result")
    public ResponseEntity<Boolean> checkUsernameExists(@PathVariable String username) {
        return ResponseEntity.ok(userService.existsByUsername(username));
    }

    /**
     * Checks email availability.
     *
     * @param email Email address to test
     * @return True if email already exists, false otherwise
     */
    @GetMapping("/check-email/{email}")
    @Operation(summary = "Check email availability", description = "Public endpoint for uniqueness verification.")
    @ApiResponse(responseCode = "200", description = "Uniqueness check result")
    public ResponseEntity<Boolean> checkEmailExists(@PathVariable String email) {
        return ResponseEntity.ok(userService.existsByEmail(email));
    }

    /**
     * Updates a user's password.
     *
     * @param id User identifier
     * @param newPassword New password string
     * @return HTTP 200 OK
     */
    @PutMapping("/{id}/password")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Change user password")
    @ApiResponse(responseCode = "200", description = "Password updated")
    public ResponseEntity<Void> changePassword(
        @PathVariable Long id,
        @RequestBody String newPassword) {
        userService.getUserById(id).ifPresent(user -> userService.changePassword(user, newPassword));
        return ResponseEntity.ok().build();
    }
}
