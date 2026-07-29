package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.LoginRequest;
import com.bar.gestioncocktail.dto.LoginResponse;
import com.bar.gestioncocktail.dto.RefreshTokenRequest;
import com.bar.gestioncocktail.dto.TokenRefreshResponse;
import com.bar.gestioncocktail.dto.UserRequestDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.model.RefreshToken;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.security.JwtTokenProvider;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.service.RefreshTokenService;
import com.bar.gestioncocktail.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Controller REST gérant le flux d'authentification utilisateur.
 * <p>
 * Fournit les endpoints de connexion (login), rafraîchissement de token (refresh token),
 * déconnexion (logout) et enregistrement d'utilisateurs.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentification", description = "Endpoints de connexion, rafraîchissement de token JWT et déconnexion")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserService userService;
    private final RefreshTokenService refreshTokenService;

    /**
     * Constructeur avec injection des dépendances d'authentification et de gestion de tokens.
     *
     * @param authenticationManager Manager Spring Security d'authentification
     * @param jwtTokenProvider Service de génération et validation de tokens JWT
     * @param userService Service de gestion des utilisateurs
     * @param refreshTokenService Service de gestion des tokens de rafraîchissement
     */
    @Autowired
    public AuthController(
            AuthenticationManager authenticationManager,
            JwtTokenProvider jwtTokenProvider,
            UserService userService,
            RefreshTokenService refreshTokenService) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userService = userService;
        this.refreshTokenService = refreshTokenService;
    }

    /**
     * Authentifie un utilisateur avec ses identifiants (username et mot de passe).
     *
     * @param loginRequest DTO contenant les identifiants
     * @return Les tokens Access Token et Refresh Token ainsi que le profil utilisateur
     */
    @PostMapping("/login")
    @Operation(summary = "Authentifier un utilisateur", description = "Vérifie les identifiants et retourne un access token JWT ainsi qu'un refresh token.")
    @ApiResponse(responseCode = "200", description = "Authentification réussie")
    @ApiResponse(responseCode = "401", description = "Identifiants invalides")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String accessToken = jwtTokenProvider.generateToken(authentication);
        User user = userService.getUserByUsername(loginRequest.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        List<String> userRoles = new java.util.ArrayList<>();
        if (user.getRoles() != null) {
            for (UserRole role : user.getRoles()) {
                if (role != null && role.getName() != null) {
                    userRoles.add(role.getName());
                }
            }
        }

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return ResponseEntity.ok(new LoginResponse(
                accessToken,
                refreshToken.getToken(),
                user.getUsername(),
                userRoles,
                user.getEmail(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        ));
    }

    /**
     * Génère un nouvel access token à partir d'un refresh token valide.
     *
     * @param request DTO contenant le refresh token
     * @return Le nouveau couple access token et refresh token
     */
    @PostMapping("/refresh")
    @Operation(summary = "Rafraîchir l'access token JWT", description = "Valide le refresh token et en émet un nouveau si celui-ci n'est pas expiré.")
    @ApiResponse(responseCode = "200", description = "Nouveau token généré avec succès")
    @ApiResponse(responseCode = "401", description = "Refresh token invalide ou expiré")
    public ResponseEntity<TokenRefreshResponse> refreshToken(@RequestBody RefreshTokenRequest request) {
        Optional<RefreshToken> optToken = refreshTokenService.findByToken(request.refreshToken());
        if (optToken.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        RefreshToken token = optToken.get();
        if (refreshTokenService.isExpired(token)) {
            refreshTokenService.deleteByUser(token.getUser());
            return ResponseEntity.status(401).build();
        }
        String newAccessToken = jwtTokenProvider.generateToken(token.getUser().getUsername());
        RefreshToken newRefresh = refreshTokenService.createRefreshToken(token.getUser());
        return ResponseEntity.ok(new TokenRefreshResponse(newAccessToken, newRefresh.getToken()));
    }

    /**
     * Déconnecte l'utilisateur courant en invalidant ses refresh tokens et réinitialisant le contexte de sécurité.
     *
     * @param authentication Contexte d'authentification courant
     * @return Statut 200 OK
     */
    @PostMapping("/logout")
    @Operation(summary = "Déconnecter l'utilisateur", description = "Invalide le refresh token de l'utilisateur et nettoie la session.")
    @ApiResponse(responseCode = "200", description = "Déconnexion effectuée")
    public ResponseEntity<Void> logout(Authentication authentication) {
        if (authentication != null) {
            userService.getUserByUsername(authentication.getName())
                .ifPresent(refreshTokenService::deleteByUser);
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok().build();
    }

    /**
     * Registers a new user in the system.
     *
     * @param request The user data to create
     * @return The created user as a DTO
     */
    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "Creates a new user account in the system.")
    @ApiResponse(responseCode = "200", description = "Registration successful")
    @ApiResponse(responseCode = "400", description = "Username or email already exists")
    public ResponseEntity<UserResponseDTO> register(@Valid @RequestBody UserRequestDTO request) {
        if (userService.existsByUsername(request.username())) {
            return ResponseEntity.badRequest().build();
        }
        if (userService.existsByEmail(request.email())) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(UserResponseDTO.from(userService.createUser(request.toEntity())));
    }
}
