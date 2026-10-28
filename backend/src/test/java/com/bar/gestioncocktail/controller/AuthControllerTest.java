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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private UserService userService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AuthController authController;

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
    void loginSuccess() {
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
        assertThat(response.getBody().getId()).isEqualTo(user.getId());
    }

    @Test
    @DisplayName("register - registers user if username and email available")
    void registerSuccess() {
        UserRequestDTO request = new UserRequestDTO("newuser", "secret", "new@bar.com", "Doe", "John", Set.of(UserRole.SERVEUR));
        when(userService.existsByUsername("newuser")).thenReturn(false);
        when(userService.existsByEmail("new@bar.com")).thenReturn(false);
        when(userService.createUser(any(User.class))).thenReturn(user);

        ResponseEntity<UserResponseDTO> response = authController.register(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("register - returns 400 if username exists")
    void registerUsernameExists() {
        UserRequestDTO request = new UserRequestDTO("testuser", "secret", "new@bar.com", "Doe", "John", Set.of(UserRole.SERVEUR));
        when(userService.existsByUsername("testuser")).thenReturn(true);

        ResponseEntity<UserResponseDTO> response = authController.register(request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("register - returns 400 if email exists")
    void registerEmailExists() {
        UserRequestDTO request = new UserRequestDTO("newuser", "secret", "test@bar.com", "Doe", "John", Set.of(UserRole.SERVEUR));
        when(userService.existsByUsername("newuser")).thenReturn(false);
        when(userService.existsByEmail("test@bar.com")).thenReturn(true);

        ResponseEntity<UserResponseDTO> response = authController.register(request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("refreshToken - generates new JWT for valid refresh token")
    void refreshTokenSuccess() {
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

    @Test
    @DisplayName("refreshToken - returns 401 when token not found")
    void refreshTokenNotFoundReturns401() {
        RefreshTokenRequest request = new RefreshTokenRequest("invalid-token");
        when(refreshTokenService.findByToken("invalid-token")).thenReturn(Optional.empty());

        ResponseEntity<TokenRefreshResponse> response = authController.refreshToken(request);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    @DisplayName("refreshToken - returns 401 and deletes when token expired")
    void refreshTokenExpiredReturns401() {
        RefreshTokenRequest request = new RefreshTokenRequest("expired-token");
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken("expired-token");
        refreshToken.setUser(user);

        when(refreshTokenService.findByToken("expired-token")).thenReturn(Optional.of(refreshToken));
        when(refreshTokenService.isExpired(refreshToken)).thenReturn(true);

        ResponseEntity<TokenRefreshResponse> response = authController.refreshToken(request);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        verify(refreshTokenService).deleteByUser(user);
    }

    @Test
    @DisplayName("logout - cleans up user refresh tokens and clears context")
    void logoutAuthenticatedAndAnonymous() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("testuser");
        when(userService.getUserByUsername("testuser")).thenReturn(Optional.of(user));

        ResponseEntity<Void> resp1 = authController.logout(auth);
        ResponseEntity<Void> resp2 = authController.logout(null);

        assertThat(resp1.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(resp2.getStatusCode().is2xxSuccessful()).isTrue();
        verify(refreshTokenService).deleteByUser(user);
    }

    @Test
    @DisplayName("login - blocks brute-force after 5 failed authentication attempts")
    void loginBruteForceLockout() {
        LoginRequest request = new LoginRequest();
        request.setUsername("bruteforceuser");
        request.setPassword("wrongpass");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("Bad credentials"));

        for (int i = 0; i < 5; i++) {
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> authController.login(request))
                    .isInstanceOf(org.springframework.security.authentication.BadCredentialsException.class);
        }

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authController.login(request))
                .isInstanceOf(com.bar.gestioncocktail.exception.BusinessException.class)
                .hasMessageContaining("Too many failed attempts");
    }
}
