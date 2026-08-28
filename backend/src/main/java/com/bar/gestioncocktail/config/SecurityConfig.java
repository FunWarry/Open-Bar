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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

import java.io.IOException;
import java.util.List;

/**
 * Spring Security configuration for OpenBar.
 * Configures stateless JWT authentication, CORS, CSRF, and role-based endpoint
 * permissions.
 * Enforces strict CORS origin patterns in production to prevent technical information leakage and unauthorized cross-origin requests.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {
    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthorizationFilter jwtAuthorizationFilter;
    private final Environment environment;
    private final List<String> allowedOriginPatterns;

    /**
     * Constructs SecurityConfig with required filters, Spring Environment, and configured CORS origin patterns.
     *
     * @param jwtAuthenticationFilter JWT authentication filter
     * @param jwtAuthorizationFilter JWT authorization filter
     * @param environment Spring environment to inspect active profiles
     * @param allowedOriginPatterns List of allowed CORS origin patterns
     */
    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            JwtAuthorizationFilter jwtAuthorizationFilter,
            Environment environment,
            @org.springframework.beans.factory.annotation.Value("${openbar.cors.allowed-origin-patterns:${OPENBAR_CORS_ALLOWED_ORIGINS:*}}") List<String> allowedOriginPatterns) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.jwtAuthorizationFilter = jwtAuthorizationFilter;
        this.environment = environment;
        this.allowedOriginPatterns = allowedOriginPatterns;
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
                    .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                    .authorizeHttpRequests(auth -> auth
                            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                            .requestMatchers(
                                    "/api/auth/**",
                                    "/api/setup/**",
                                    "/api/settings",
                                    "/api/ws/**",
                                    "/ws/**",
                                    "/api/client/**",
                                    "/v3/api-docs/**",
                                    "/swagger-ui/**",
                                    "/swagger-ui.html",
                                    "/uploads/**",
                                    "/actuator/health",
                                    "/actuator/info")
                            .permitAll()
                            .anyRequest().authenticated())
                    .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                    .addFilterAfter(jwtAuthorizationFilter, UsernamePasswordAuthenticationFilter.class)
                    .exceptionHandling(ex -> ex
                            .authenticationEntryPoint((request, response, authException) -> writeError(
                                    response,
                                    HttpServletResponse.SC_UNAUTHORIZED,
                                    "Unauthorized",
                                    "Authentication required or invalid token"))
                            .accessDeniedHandler((request, response, accessDeniedException) -> writeError(
                                    response,
                                    HttpServletResponse.SC_FORBIDDEN,
                                    "Forbidden",
                                    "Insufficient permissions to access this resource")))
                    .build();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to configure security filter chain", e);
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
        configuration.setAllowedOriginPatterns(resolveEffectiveOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> resolveEffectiveOrigins() {
        if (isProdProfile()) {
            List<String> filtered = (allowedOriginPatterns != null)
                    ? allowedOriginPatterns.stream()
                            .filter(p -> p != null && !p.trim().equals("*") && !p.trim().isEmpty())
                            .toList()
                    : List.of();
            if (filtered.isEmpty()) {
                log.warn("Wildcard '*' or empty CORS origin is disallowed in production. Falling back to default authorized local/PWA origins.");
                return List.of(
                        "http://localhost:[*]",
                        "http://127.0.0.1:[*]",
                        "https://open-bar.freeboxos.fr",
                        "http://192.168.*:[*]",
                        "http://10.*:[*]",
                        "http://172.16.*:[*]"
                );
            }
            return filtered;
        }
        return (allowedOriginPatterns != null && !allowedOriginPatterns.isEmpty())
                ? allowedOriginPatterns
                : List.of("*");
    }

    private boolean isProdProfile() {
        return environment != null && environment.acceptsProfiles(Profiles.of("prod"));
    }
}