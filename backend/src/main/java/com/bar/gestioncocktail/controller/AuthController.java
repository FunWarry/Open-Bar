package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.LoginRequest;
import com.bar.gestioncocktail.dto.LoginResponse;
import com.bar.gestioncocktail.dto.RefreshTokenRequest;
import com.bar.gestioncocktail.dto.TokenRefreshResponse;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.model.RefreshToken;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.security.JwtTokenProvider;
import com.bar.gestioncocktail.service.RefreshTokenService;
import com.bar.gestioncocktail.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserService userService;
    private final RefreshTokenService refreshTokenService;

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

    @PostMapping("/login")
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
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        List<String> userRoles = user.getRoles()
                .stream()
                .map(UserRole::getName)
                .toList();

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

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody RefreshTokenRequest request) {
        return refreshTokenService.findByToken(request.refreshToken())
            .map(token -> {
                if (refreshTokenService.isExpired(token)) {
                    refreshTokenService.deleteByUser(token.getUser());
                    return ResponseEntity.status(401).body("Refresh token expiré");
                }
                String newAccessToken = jwtTokenProvider.generateToken(token.getUser().getUsername());
                RefreshToken newRefresh = refreshTokenService.createRefreshToken(token.getUser());
                return ResponseEntity.ok(new TokenRefreshResponse(newAccessToken, newRefresh.getToken()));
            })
            .orElse(ResponseEntity.status(401).body("Refresh token invalide"));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(Authentication authentication) {
        if (authentication != null) {
            userService.getUserByUsername(authentication.getName())
                .ifPresent(refreshTokenService::deleteByUser);
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponseDTO> register(@Valid @RequestBody User user) {
        if (userService.existsByUsername(user.getUsername())) {
            return ResponseEntity.badRequest().build();
        }
        if (userService.existsByEmail(user.getEmail())) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(UserResponseDTO.from(userService.createUser(user)));
    }
}
