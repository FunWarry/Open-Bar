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
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * REST controller managing user authentication workflows.
 * <p>
 * Provides endpoints for login, JWT access token refresh, logout, and user registration.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "User authentication, JWT token refresh, and logout endpoints")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserService userService;
    private final RefreshTokenService refreshTokenService;

    /**
     * Constructs the controller with authentication and token service dependencies.
     *
     * @param authenticationManager Spring Security authentication manager
     * @param jwtTokenProvider JWT token provider service
     * @param userService User management service
     * @param refreshTokenService Refresh token management service
     */
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
     * Authenticates a user using credentials (username and password).
     *
     * @param loginRequest DTO containing credentials
     * @return Access token, refresh token, and user profile
     */
    @PostMapping("/login")
    @Operation(summary = "Authenticate user", description = "Validates user credentials and returns JWT access token along with refresh token.")
    @ApiResponse(responseCode = "200", description = "Authentication successful")
    @ApiResponse(responseCode = "401", description = "Invalid credentials")
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
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
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
     * Generates a new access token from a valid refresh token.
     *
     * @param request DTO containing the refresh token
     * @return New pair of access token and refresh token
     */
    @PostMapping("/refresh")
    @Operation(summary = "Refresh JWT access token", description = "Validates refresh token and issues a new access token if not expired.")
    @ApiResponse(responseCode = "200", description = "New token generated successfully")
    @ApiResponse(responseCode = "401", description = "Invalid or expired refresh token")
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
     * Logs out current user by invalidating their refresh tokens and clearing the security context.
     *
     * @param authentication Current authentication context
     * @return HTTP 200 OK
     */
    @PostMapping("/logout")
    @Operation(summary = "Logout user", description = "Invalidates user refresh tokens and clears authentication context.")
    @ApiResponse(responseCode = "200", description = "Logged out successfully")
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
