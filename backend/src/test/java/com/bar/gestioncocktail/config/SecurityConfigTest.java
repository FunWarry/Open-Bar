package com.bar.gestioncocktail.config;

import com.bar.gestioncocktail.security.JwtAuthenticationFilter;
import com.bar.gestioncocktail.security.JwtAuthorizationFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Mock
    private JwtAuthorizationFilter jwtAuthorizationFilter;

    @Test
    @DisplayName("corsConfigurationSource - validates allowed origins, methods, and credentials")
    void corsConfigurationSource_validConfig() {
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, jwtAuthorizationFilter);
        CorsConfigurationSource source = config.corsConfigurationSource();

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/cocktails");

        CorsConfiguration corsConfig = source.getCorsConfiguration(request);

        assertThat(corsConfig).isNotNull();
        assertThat(corsConfig.getAllowCredentials()).isTrue();
        assertThat(corsConfig.getAllowedMethods()).contains("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
        assertThat(corsConfig.getAllowedOriginPatterns()).contains(
                "http://localhost:[*]",
                "http://127.0.0.1:[*]",
                "http://192.168.[*]",
                "http://10.[*]",
                "http://open-bar.freeboxos.fr:[*]",
                "https://open-bar.freeboxos.fr:[*]",
                "http://open-bar.freeboxos.fr",
                "https://open-bar.freeboxos.fr");
    }

    @Test
    @DisplayName("authenticationManager - delegates to AuthenticationConfiguration")
    void authenticationManager_delegates() {
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, jwtAuthorizationFilter);
        AuthenticationConfiguration authConfig = mock(AuthenticationConfiguration.class);
        AuthenticationManager authManager = mock(AuthenticationManager.class);

        when(authConfig.getAuthenticationManager()).thenReturn(authManager);

        AuthenticationManager result = config.authenticationManager(authConfig);
        assertThat(result).isEqualTo(authManager);
    }
}
