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
    @DisplayName("corsConfigurationSource - configures origins from CorsOriginResolver, methods, and credentials")
    void corsConfigurationSource_validConfig() {
        List<String> origins = List.of("http://localhost:[*]", "https://open-bar.freeboxos.fr");
        CorsOriginResolver resolver = new CorsOriginResolver(new MockEnvironment(), origins);
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, jwtAuthorizationFilter, resolver);
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
    @DisplayName("authenticationManager - delegates to AuthenticationConfiguration")
    void authenticationManager_delegates() {
        CorsOriginResolver resolver = new CorsOriginResolver(new MockEnvironment(), List.of("*"));
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, jwtAuthorizationFilter, resolver);
        AuthenticationConfiguration authConfig = mock(AuthenticationConfiguration.class);
        AuthenticationManager authManager = mock(AuthenticationManager.class);

        when(authConfig.getAuthenticationManager()).thenReturn(authManager);

        AuthenticationManager result = config.authenticationManager(authConfig);
        assertThat(result).isEqualTo(authManager);
    }
}
