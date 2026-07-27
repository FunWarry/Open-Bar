package com.bar.gestioncocktail.security;

import com.bar.gestioncocktail.config.JwtProperties;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.security.core.userdetails.UserDetails;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtTokenProvider {
    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);
    private final SecretKey key;
    private final long jwtExpiration;

    @Autowired
    public JwtTokenProvider(JwtProperties jwtProperties) {
        this.key = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes());
        this.jwtExpiration = jwtProperties.getExpiration();
    }

    public String generateToken(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserDetails userDetails) {
            return generateToken(userDetails.getUsername());
        }
        if (authentication != null && authentication.getName() != null) {
            return generateToken(authentication.getName());
        }
        throw new IllegalArgumentException("Authentication principal cannot be null");
    }

    public String generateToken(String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
                .subject(username)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String getUsernameFromJWT(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public boolean validateToken(String authToken) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            logger.error("Token JWT invalide : {}", e.getMessage());
            return false;
        }
    }
}
