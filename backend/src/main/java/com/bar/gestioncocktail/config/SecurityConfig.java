package com.bar.gestioncocktail.config;

import com.bar.gestioncocktail.security.JwtAuthenticationFilter;
import com.bar.gestioncocktail.security.JwtAuthorizationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.List;

/**
 * Spring Security configuration for OpenBar.
 * Configures stateless JWT authentication, CORS, CSRF, and role-based endpoint permissions.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthorizationFilter jwtAuthorizationFilter;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            JwtAuthorizationFilter jwtAuthorizationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.jwtAuthorizationFilter = jwtAuthorizationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) {
        try {
            return http
                    .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                    .csrf(csrf -> csrf
                            .csrfTokenRepository(new PassthroughCsrfTokenRepository())
                            .csrfTokenRequestHandler((request, response, deferredCsrfToken) -> {
                                CsrfToken token = deferredCsrfToken.get();
                                if (token != null) {
                                    request.setAttribute(CsrfToken.class.getName(), token);
                                    request.setAttribute("_csrf", token);
                                }
                            }))
                    .sessionManagement(session -> session
                            .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                    .authorizeHttpRequests(auth -> auth
                            .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/api-docs/**")
                            .permitAll()
                            .requestMatchers("/api/auth/**", "/api/test/health", "/api/setup/**", "/api/public/**")
                            .permitAll()
                            .requestMatchers("/uploads/**").permitAll()
                            .requestMatchers("/api/users/check-username/**").permitAll()
                            .requestMatchers("/api/users/check-email/**").permitAll()
                            .requestMatchers("/ws/**", "/api/ws/**").permitAll()
                            // Application customization settings readable prior to authentication (login screen)
                            .requestMatchers(HttpMethod.GET, "/api/settings").permitAll()
                            .anyRequest().authenticated())
                    .exceptionHandling(ex -> ex
                            .accessDeniedHandler((request, response, _) -> writeError(response,
                                    HttpServletResponse.SC_FORBIDDEN, "Forbidden", "Access denied"))
                            .authenticationEntryPoint((request, response, _) -> writeError(response,
                                    HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized", "Not authenticated")))
                    .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                    .addFilterBefore(jwtAuthorizationFilter, UsernamePasswordAuthenticationFilter.class)
                    .build();
        } catch (Exception e) {
            throw new IllegalStateException("Error building SecurityFilterChain", e);
        }
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) {
        try {
            return config.getAuthenticationManager();
        } catch (Exception e) {
            throw new IllegalStateException("Error retrieving AuthenticationManager", e);
        }
    }

    private void writeError(HttpServletResponse response, int status, String error, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                "{\"status\":" + status + ",\"error\":\"" + error + "\",\"message\":\"" + message + "\"}");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:[*]",
                "http://127.0.0.1:[*]",
                "http://192.168.[*]",
                "http://10.[*]"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}