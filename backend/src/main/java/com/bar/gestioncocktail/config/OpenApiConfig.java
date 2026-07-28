package com.bar.gestioncocktail.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration OpenAPI (Springdoc / Swagger UI) pour le projet OpenBar.
 * Définit les métadonnées globales de l'API REST ainsi que le schéma de sécurité
 * HTTP Bearer JWT permettant l'authentification interactive dans Swagger UI.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Bean de personnalisation globale de la documentation OpenAPI.
     *
     * @return L'instance configurée d'{@link OpenAPI}
     */
    @Bean
    public OpenAPI openBarOpenAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
            .info(new Info()
                .title("OpenBar API REST")
                .description("API REST de la solution OpenBar pour la gestion en temps réel des commandes, stocks, factures et plan de salle.")
                .version("1.0.0")
                .contact(new Contact()
                    .name("Équipe OpenBar")
                    .url("https://github.com/FunWarry/Open-Bar"))
                .license(new License()
                    .name("MIT License")))
            .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
            .components(new Components()
                .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                    .name(securitySchemeName)
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("Insérer le token JWT d'authentification (ex: 'eyJhbGci...')")));
    }
}
