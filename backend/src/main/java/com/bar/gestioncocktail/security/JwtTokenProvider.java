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

/**
 * Composant de gestion des jetons JWT (JSON Web Tokens).
 * <p>
 * Responsable de la signature HMAC-SHA, de la génération d'access tokens à partir du contexte
 * d'authentification ou du nom d'utilisateur, de l'extraction du sujet et de la validation d'intégrité.
 */
@Component
public class JwtTokenProvider {
    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);
    private final SecretKey key;
    private final long jwtExpiration;

    /**
     * Constructeur injectant les propriétés JWT (secret et durée de validité).
     *
     * @param jwtProperties Propriétés de configuration {@link JwtProperties}
     */
    @Autowired
    public JwtTokenProvider(JwtProperties jwtProperties) {
        this.key = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes());
        this.jwtExpiration = jwtProperties.getExpiration();
    }

    /**
     * Génère un jeton JWT signé à partir du principal d'authentification Spring Security.
     *
     * @param authentication Le contexte d'authentification valide
     * @return Le token JWT sous forme de chaîne de caractères compactée
     */
    public String generateToken(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserDetails userDetails) {
            return generateToken(userDetails.getUsername());
        }
        if (authentication != null && authentication.getName() != null) {
            return generateToken(authentication.getName());
        }
        throw new IllegalArgumentException("Authentication principal cannot be null");
    }

    /**
     * Génère un jeton JWT signé pour un nom d'utilisateur spécifique.
     *
     * @param username Nom d'utilisateur
     * @return Le token JWT compacté
     */
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

    /**
     * Extrait le nom d'utilisateur (Subject) contenu dans le jeton JWT.
     *
     * @param token Le token JWT
     * @return Le nom d'utilisateur extrait
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
     * Valide la signature, le format et la durée de conservation du jeton JWT.
     *
     * @param authToken Le token JWT à vérifier
     * @return {@code true} si le token est valide, {@code false} s'il est altéré ou expiré
     */
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
