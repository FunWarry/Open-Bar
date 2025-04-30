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

    /* 
     * La méthode ci-dessous a été commentée car DockerDbInitializer n'est pas trouvé.
     * Pour résoudre ce problème, vous devez soit :
     * 1. Créer cette classe et l'annoter avec @Component ou @Service
     * 2. Supprimer cette méthode si elle n'est pas nécessaire
     */
    @Bean
    public ApplicationRunner dockerAndDbInitializer(DockerDbInitializer initializer) {
        return args -> initializer.init();
    }
}