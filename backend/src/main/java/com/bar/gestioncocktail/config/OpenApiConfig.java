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
 * OpenAPI configuration (Springdoc / Swagger UI) for OpenBar.
 * Defines global REST API metadata as well as HTTP Bearer JWT security schema
 * enabling interactive authentication within Swagger UI.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Bean configuring global OpenAPI documentation properties.
     *
     * @return Configured {@link OpenAPI} instance
     */
    @Bean
    public OpenAPI openBarOpenAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
            .info(new Info()
                .title("OpenBar REST API")
                .description("REST API for OpenBar real-time bar management system (orders, stocks, invoices, staff scheduling, and floor plan).")
                .version("1.0.0")
                .contact(new Contact()
                    .name("OpenBar Team")
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
                    .description("Insert Bearer JWT authentication token (e.g. 'eyJhbGci...')")));
    }
}
