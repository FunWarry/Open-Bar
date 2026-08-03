package com.bar.gestioncocktail.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Spring Web MVC configuration for exposing uploaded static files.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * Registers resource handlers to serve uploaded files under /uploads/** path.
     *
     * @param registry ResourceHandlerRegistry instance
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadDir = Paths.get("uploads");
        String uploadPath = uploadDir.toFile().getAbsolutePath();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadPath + "/");
    }
}
