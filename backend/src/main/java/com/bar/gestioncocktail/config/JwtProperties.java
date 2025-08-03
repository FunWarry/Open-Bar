package com.bar.gestioncocktail.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "spring.security.jwt")
public class JwtProperties {
    private String secret;
    private long expiration;

    @Override
    public String toString() {
        return "JwtProperties{" +
                "secret='" + secret + '\'' +
                ", expiration=" + expiration +
                '}';
    }
}
