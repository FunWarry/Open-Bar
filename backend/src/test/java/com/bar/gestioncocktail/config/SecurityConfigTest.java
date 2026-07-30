package com.bar.gestioncocktail.config;

import com.bar.gestioncocktail.security.JwtAuthenticationFilter;
import com.bar.gestioncocktail.security.JwtAuthorizationFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock
    JwtAuthenticationFilter jwtAuthFilter;

    @Mock
    JwtAuthorizationFilter jwtAuthorFilter;

    @Mock
    AuthenticationConfiguration authConfig;

    @Mock
    AuthenticationManager authManager;

    @Test
    @DisplayName("corsConfigurationSource - should build non-null CORS configuration source")
    void corsConfigurationSource_returnsValidSource() {
        SecurityConfig config = new SecurityConfig(jwtAuthFilter, jwtAuthorFilter);

        CorsConfigurationSource source = config.corsConfigurationSource();

        assertThat(source).isNotNull();
    }

    @Test
    @DisplayName("authenticationManager - should delegate to AuthenticationConfiguration")
    void authenticationManager_delegatesToConfig() {
        SecurityConfig config = new SecurityConfig(jwtAuthFilter, jwtAuthorFilter);

        when(authConfig.getAuthenticationManager()).thenReturn(authManager);

        AuthenticationManager result = config.authenticationManager(authConfig);

        assertThat(result).isEqualTo(authManager);
    }
}
