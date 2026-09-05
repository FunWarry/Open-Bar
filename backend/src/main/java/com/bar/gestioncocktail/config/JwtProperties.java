package com.bar.gestioncocktail.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.charset.StandardCharsets;

/**
 * Configuration properties for JWT authentication.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "spring.security.jwt")
public class JwtProperties {

    // 256 bits minimum required by HMAC-SHA, measured in bytes — JJWT relies on
    // the byte length of secret.getBytes() (used by Keys.hmacShaKeyFor),
    // not the character count (which can diverge for non-ASCII secrets).
    private static final int MIN_SECRET_BYTES = 32;

    private String secret;
    private long expiration;

    @PostConstruct
    void validate() {
        if (secret == null || secret.isBlank() || secret.equals("${JWT_SECRET}")) {
            throw new IllegalStateException(
                    "The JWT_SECRET environment variable is not defined. "
                            + "Please define it before starting the backend, for example: "
                            + "export JWT_SECRET=$(openssl rand -base64 32) "
                            + "— see backend/.env.example for format reference.");
        }
        int secretBytes = secret.getBytes(StandardCharsets.UTF_8).length;
        if (secretBytes < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET length is " + secretBytes + " bytes, but at least "
                            + MIN_SECRET_BYTES + " bytes (256 bits) are required for secure HMAC-SHA. "
                            + "Generate a new one, for example: export JWT_SECRET=$(openssl rand -base64 32)");
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
