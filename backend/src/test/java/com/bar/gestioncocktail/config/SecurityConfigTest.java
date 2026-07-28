package com.bar.gestioncocktail.config;

import com.bar.gestioncocktail.security.JwtAuthenticationFilter;
import com.bar.gestioncocktail.security.JwtAuthorizationFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SecurityConfigTest {

    @Test
    @DisplayName("corsConfigurationSource - should build non-null CORS configuration source")
    void corsConfigurationSource_returnsValidSource() {
        JwtAuthenticationFilter jwtAuthFilter = mock(JwtAuthenticationFilter.class);
        JwtAuthorizationFilter jwtAuthorFilter = mock(JwtAuthorizationFilter.class);
        SecurityConfig config = new SecurityConfig(jwtAuthFilter, jwtAuthorFilter);

        CorsConfigurationSource source = config.corsConfigurationSource();

        assertThat(source).isNotNull();
    }

    @Test
    @DisplayName("authenticationManager - should delegate to AuthenticationConfiguration")
    void authenticationManager_delegatesToConfig() throws Exception {
        JwtAuthenticationFilter jwtAuthFilter = mock(JwtAuthenticationFilter.class);
        JwtAuthorizationFilter jwtAuthorFilter = mock(JwtAuthorizationFilter.class);
        SecurityConfig config = new SecurityConfig(jwtAuthFilter, jwtAuthorFilter);

        AuthenticationConfiguration authConfig = mock(AuthenticationConfiguration.class);
        AuthenticationManager authManager = mock(AuthenticationManager.class);
        when(authConfig.getAuthenticationManager()).thenReturn(authManager);

        AuthenticationManager result = config.authenticationManager(authConfig);

        assertThat(result).isEqualTo(authManager);
    }
}
