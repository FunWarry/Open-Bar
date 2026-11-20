package com.bar.gestioncocktail;

import com.bar.gestioncocktail.config.JwtProperties;
import com.bar.gestioncocktail.config.LicenseProperties;
import com.bar.gestioncocktail.config.MonetizationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;
/**
 * Main Spring Boot application entry point for the OpenBar restaurant and bar management platform.
 */

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({JwtProperties.class, LicenseProperties.class, MonetizationProperties.class})
public class GestionCocktailApplication {
    public static void main(String[] args) {
        SpringApplication.run(GestionCocktailApplication.class, args);
    }
}