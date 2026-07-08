package com.bar.gestioncocktail.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.charset.StandardCharsets;

@Getter
@Setter
@ConfigurationProperties(prefix = "spring.security.jwt")
public class JwtProperties {

    // 256 bits minimum requis par HMAC-SHA, mesurés en octets — c'est bien le nombre
    // d'octets de secret.getBytes() (utilisé par Keys.hmacShaKeyFor) qui compte pour
    // JJWT, pas le nombre de caractères (qui diverge pour un secret non-ASCII).
    private static final int MIN_SECRET_BYTES = 32;

    private String secret;
    private long expiration;

    @PostConstruct
    void validate() {
        if (secret == null || secret.isBlank() || secret.equals("${JWT_SECRET}")) {
            throw new IllegalStateException(
                    "La variable d'environnement JWT_SECRET n'est pas définie. "
                            + "Définissez-la avant de lancer le backend, par exemple : "
                            + "export JWT_SECRET=$(openssl rand -base64 32) "
                            + "— voir backend/.env.example pour un exemple de format (à remplacer par une valeur générée).");
        }
        int secretBytes = secret.getBytes(StandardCharsets.UTF_8).length;
        if (secretBytes < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET fait " + secretBytes + " octets, il en faut au moins "
                            + MIN_SECRET_BYTES + " (256 bits) pour un HMAC-SHA sécurisé. "
                            + "Générez-en un nouveau, par exemple : export JWT_SECRET=$(openssl rand -base64 32)");
        }
    }

    @Override
    public String toString() {
        return "JwtProperties{" +
                "secret='[REDACTED]'" +
                ", expiration=" + expiration +
                '}';
    }
}
