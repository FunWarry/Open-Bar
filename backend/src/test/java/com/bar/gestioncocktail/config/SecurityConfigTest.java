package com.bar.gestioncocktail.config;

import com.bar.gestioncocktail.security.JwtAuthenticationFilter;
import com.bar.gestioncocktail.security.JwtAuthorizationFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

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
    @DisplayName("corsConfigurationSource - validates allowed origins, methods, and credentials in dev mode")
    void corsConfigurationSource_validConfig() {
        List<String> origins = List.of("http://localhost:[*]", "https://*.local:[*]", "https://example.com");
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, jwtAuthorizationFilter, new MockEnvironment(), origins);
        CorsConfigurationSource source = config.corsConfigurationSource();

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/cocktails");

        CorsConfiguration corsConfig = source.getCorsConfiguration(request);

        assertThat(corsConfig).isNotNull();
        assertThat(corsConfig.getAllowCredentials()).isTrue();
        assertThat(corsConfig.getAllowedMethods()).contains("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
        assertThat(corsConfig.getAllowedOriginPatterns()).containsExactlyElementsOf(origins);
    }

    @Test
    @DisplayName("corsConfigurationSource - prod mode filters out wildcard and preserves explicit origins")
    void corsConfigurationSource_prodMode_filtersWildcard() {
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");

        List<String> origins = List.of("*", "https://open-bar.freeboxos.fr", "http://192.168.1.50:8080");
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, jwtAuthorizationFilter, prodEnv, origins);
        CorsConfigurationSource source = config.corsConfigurationSource();

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/cocktails");

        CorsConfiguration corsConfig = source.getCorsConfiguration(request);

        assertThat(corsConfig).isNotNull();
        assertThat(corsConfig.getAllowCredentials()).isTrue();
        assertThat(corsConfig.getAllowedOriginPatterns()).doesNotContain("*");
        assertThat(corsConfig.getAllowedOriginPatterns()).containsExactly("https://open-bar.freeboxos.fr", "http://192.168.1.50:8080");
    }

    @Test
    @DisplayName("corsConfigurationSource - prod mode falls back to safe local origins when only wildcard is provided")
    void corsConfigurationSource_prodMode_wildcardFallback() {
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");

        List<String> origins = List.of("*");
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, jwtAuthorizationFilter, prodEnv, origins);
        CorsConfigurationSource source = config.corsConfigurationSource();

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/cocktails");

        CorsConfiguration corsConfig = source.getCorsConfiguration(request);

        assertThat(corsConfig).isNotNull();
        assertThat(corsConfig.getAllowedOriginPatterns()).doesNotContain("*");
        assertThat(corsConfig.getAllowedOriginPatterns()).contains(
                "http://localhost:[*]",
                "http://127.0.0.1:[*]",
                "https://open-bar.freeboxos.fr"
        );
    }

    @Test
    @DisplayName("corsConfigurationSource - prod mode falls back to safe local origins when origin list is empty")
    void corsConfigurationSource_prodMode_emptyListFallback() {
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");

        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, jwtAuthorizationFilter, prodEnv, List.of());
        CorsConfigurationSource source = config.corsConfigurationSource();

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/cocktails");

        CorsConfiguration corsConfig = source.getCorsConfiguration(request);

        assertThat(corsConfig).isNotNull();
        assertThat(corsConfig.getAllowedOriginPatterns()).isNotEmpty();
        assertThat(corsConfig.getAllowedOriginPatterns()).contains("https://open-bar.freeboxos.fr");
    }

    @Test
    @DisplayName("authenticationManager - delegates to AuthenticationConfiguration")
    void authenticationManager_delegates() {
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, jwtAuthorizationFilter, new MockEnvironment(), List.of("*"));
        AuthenticationConfiguration authConfig = mock(AuthenticationConfiguration.class);
        AuthenticationManager authManager = mock(AuthenticationManager.class);

        when(authConfig.getAuthenticationManager()).thenReturn(authManager);

        AuthenticationManager result = config.authenticationManager(authConfig);
        assertThat(result).isEqualTo(authManager);
    }
}
