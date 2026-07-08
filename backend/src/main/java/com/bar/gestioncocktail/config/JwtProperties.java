package com.bar.gestioncocktail.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "spring.security.jwt")
public class JwtProperties {

    private static final int MIN_SECRET_LENGTH = 32; // 256 bits minimum requis par HMAC-SHA

    private String secret;
    private long expiration;

    @PostConstruct
    void validate() {
        if (secret == null || secret.isBlank() || secret.equals("${JWT_SECRET}")) {
            throw new IllegalStateException(
                    "La variable d'environnement JWT_SECRET n'est pas définie. "
                            + "Définissez-la avant de lancer le backend, par exemple : "
                            + "export JWT_SECRET=$(openssl rand -base64 32) "
                            + "— voir backend/.env.example pour une valeur de dev prête à l'emploi.");
        }
        if (secret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                    "JWT_SECRET fait " + secret.length() + " caractères, il en faut au moins "
                            + MIN_SECRET_LENGTH + " (256 bits) pour un HMAC-SHA sécurisé. "
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
