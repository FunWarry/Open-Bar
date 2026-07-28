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
import com.bar.gestioncocktail.service.RefreshTokenService;
import com.bar.gestioncocktail.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    AuthenticationManager authenticationManager;

    @Mock
    JwtTokenProvider tokenProvider;

    @Mock
    UserService userService;

    @Mock
    RefreshTokenService refreshTokenService;

    @InjectMocks
    AuthController authController;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setUsername("testuser");
        user.setEmail("test@bar.com");
        user.setPassword("secret");
        user.setRoles(Set.of(UserRole.ADMIN));
    }

    @Test
    @DisplayName("login - successful authentication returns token response")
    void login_success() {
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("secret");

        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(tokenProvider.generateToken(any(Authentication.class))).thenReturn("jwt-token");
        when(userService.getUserByUsername("testuser")).thenReturn(Optional.of(user));

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken("refresh-token");
        when(refreshTokenService.createRefreshToken(user)).thenReturn(refreshToken);

        ResponseEntity<LoginResponse> response = authController.login(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getToken()).isEqualTo("jwt-token");
        assertThat(response.getBody().getRefreshToken()).isEqualTo("refresh-token");
    }

    @Test
    @DisplayName("register - registers user if username and email available")
    void register_success() {
        UserRequestDTO request = new UserRequestDTO("newuser", "secret", "new@bar.com", "Doe", "John", Set.of(UserRole.SERVEUR));
        when(userService.existsByUsername("newuser")).thenReturn(false);
        when(userService.existsByEmail("new@bar.com")).thenReturn(false);
        when(userService.createUser(any(User.class))).thenReturn(user);

        ResponseEntity<UserResponseDTO> response = authController.register(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("register - returns 400 if username exists")
    void register_usernameExists() {
        UserRequestDTO request = new UserRequestDTO("testuser", "secret", "new@bar.com", "Doe", "John", Set.of(UserRole.SERVEUR));
        when(userService.existsByUsername("testuser")).thenReturn(true);

        ResponseEntity<UserResponseDTO> response = authController.register(request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("register - returns 400 if email exists")
    void register_emailExists() {
        UserRequestDTO request = new UserRequestDTO("newuser", "secret", "test@bar.com", "Doe", "John", Set.of(UserRole.SERVEUR));
        when(userService.existsByUsername("newuser")).thenReturn(false);
        when(userService.existsByEmail("test@bar.com")).thenReturn(true);

        ResponseEntity<UserResponseDTO> response = authController.register(request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("refreshToken - generates new JWT for valid refresh token")
    void refreshToken_success() {
        RefreshTokenRequest request = new RefreshTokenRequest("valid-refresh");
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken("valid-refresh");
        refreshToken.setUser(user);
        refreshToken.setExpiryDate(Instant.now().plusSeconds(3600));

        when(refreshTokenService.findByToken("valid-refresh")).thenReturn(Optional.of(refreshToken));
        when(refreshTokenService.isExpired(refreshToken)).thenReturn(false);
        when(tokenProvider.generateToken("testuser")).thenReturn("new-jwt-token");
        when(refreshTokenService.createRefreshToken(user)).thenReturn(refreshToken);

        ResponseEntity<TokenRefreshResponse> response = authController.refreshToken(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().accessToken()).isEqualTo("new-jwt-token");
    }
}
