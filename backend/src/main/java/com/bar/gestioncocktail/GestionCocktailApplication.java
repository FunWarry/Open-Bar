package com.bar.gestioncocktail;

import com.bar.gestioncocktail.config.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(JwtProperties.class)
public class GestionCocktailApplication {
    public static void main(String[] args) {
        SpringApplication.run(GestionCocktailApplication.class, args);
    }
}