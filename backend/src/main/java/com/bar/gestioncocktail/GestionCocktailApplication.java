package com.bar.gestioncocktail;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
@EnableScheduling
public class GestionCocktailApplication {
    public static void main(String[] args) {
        SpringApplication.run(GestionCocktailApplication.class, args);
    }
    
    @Bean
    public ApplicationRunner dockerAndDbInitializer(DockerDbInitializer initializer) {
        return args -> initializer.init();
    }
}