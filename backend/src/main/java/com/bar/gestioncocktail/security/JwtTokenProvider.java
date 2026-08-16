package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.config.JwtProperties;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.security.core.userdetails.UserDetails;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.SecretKey;
import java.time.Instant;

/**
 * Component for JSON Web Token (JWT) management.
 * <p>
 * Responsible for HMAC-SHA signing, generating access tokens from Spring Security authentication
 * contexts or usernames, subject extraction, and token integrity validation.
 */
@Component
public class JwtTokenProvider {
    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);
    private final SecretKey key;
    private final long jwtExpiration;

    /**
     * Constructs the provider injecting JWT properties (secret and expiration duration).
     *
     * @param jwtProperties JWT configuration properties {@link JwtProperties}
     */
    public JwtTokenProvider(JwtProperties jwtProperties) {
        this.key = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes());
        this.jwtExpiration = jwtProperties.getExpiration();
    }

    /**
     * Generates a signed JWT token from Spring Security authentication principal.
     *
     * @param authentication Valid authentication context
     * @return Compacted JWT token string
     */
    public String generateToken(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserDetails userDetails) {
            return generateToken(userDetails.getUsername());
        }
        if (authentication != null && authentication.getName() != null) {
            return generateToken(authentication.getName());
        }
        throw new IllegalStateException("Authentication principal cannot be null");
    }

    /**
     * Generates a signed JWT token for a specific username.
     *
     * @param username Username
     * @return Compacted JWT token string
     */
    public String generateToken(String username) {
        Instant now = Instant.now();
        Instant expiryDate = now.plusMillis(jwtExpiration);

        return Jwts.builder()
                .subject(username)
                .issuedAt(java.util.Date.from(now))
                .expiration(java.util.Date.from(expiryDate))
                .signWith(key)
                .compact();
    }

    /**
     * Extracts username (Subject) from JWT token.
     *
     * @param token JWT token string
     * @return Extracted username
     */
    public String getUsernameFromJWT(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    /**
     * Validates JWT signature, format, and expiration.
     *
     * @param authToken JWT token to verify
     * @return {@code true} if valid, {@code false} if altered or expired
     */
    public boolean validateToken(String authToken) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            logger.error("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }
}
