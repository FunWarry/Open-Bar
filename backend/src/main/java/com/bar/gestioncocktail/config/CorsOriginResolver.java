package com.bar.gestioncocktail.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Resolves effective allowed CORS origin patterns based on environment configuration and active profiles.
 * Disallows insecure open wildcard origins in production environments and applies authorized default fallbacks.
 */
@Component
public class CorsOriginResolver {

    private static final Logger log = LoggerFactory.getLogger(CorsOriginResolver.class);

    private static final List<String> DEFAULT_FALLBACK_ORIGINS = List.of(
            "http://localhost:[*]",
            "http://127.0.0.1:[*]",
            "https://open-bar.freeboxos.fr",
            "http://192.168.*:[*]",
            "http://10.*:[*]",
            "http://172.16.*:[*]"
    );

    private final Environment environment;
    private final List<String> allowedOriginPatterns;

    /**
     * Constructs a CorsOriginResolver with Spring environment and configured allowed origin patterns.
     *
     * @param environment Spring Environment to inspect active profiles
     * @param allowedOriginPatterns Configured allowed CORS origin patterns
     */
    public CorsOriginResolver(
            Environment environment,
            @Value("${openbar.cors.allowed-origin-patterns:${OPENBAR_CORS_ALLOWED_ORIGINS:*}}") List<String> allowedOriginPatterns) {
        this.environment = environment;
        this.allowedOriginPatterns = allowedOriginPatterns;
    }

    /**
     * Resolves the list of effective allowed origin patterns.
     * In production profiles, wildcards ('*') are stripped, and a safe default fallback is used if no valid origins remain.
     *
     * @return List of effective CORS origin patterns
     */
    public List<String> resolveEffectiveOrigins() {
        if (isProdProfile()) {
            List<String> filtered = (allowedOriginPatterns != null)
                    ? allowedOriginPatterns.stream()
                            .filter(p -> p != null && !p.trim().equals("*") && !p.trim().isEmpty())
                            .toList()
                    : List.of();
            if (filtered.isEmpty()) {
                log.warn("Wildcard '*' or empty CORS origin is disallowed in production. Falling back to default authorized local/PWA origins.");
                return DEFAULT_FALLBACK_ORIGINS;
            }
            return filtered;
        }
        return (allowedOriginPatterns != null && !allowedOriginPatterns.isEmpty())
                ? allowedOriginPatterns
                : List.of("*");
    }

    /**
     * Checks if the active profile contains the production profile.
     *
     * @return true if running in 'prod' profile, false otherwise
     */
    public boolean isProdProfile() {
        return environment != null && environment.acceptsProfiles(Profiles.of("prod"));
    }
}
