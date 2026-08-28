package com.bar.gestioncocktail.config;

import com.bar.gestioncocktail.security.SanitizingDeserializerModifier;
import com.bar.gestioncocktail.security.SanitizingStringDeserializer;
import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Configuration registering the global HTML and XSS sanitizing string deserializer module.
 */
@Configuration
public class JacksonSanitizerConfig {

    /**
     * Registers the SanitizingModule with Jackson.
     * Spring Boot automatically registers all beans of type {@link Module}
     * into the primary auto-configured ObjectMapper.
     *
     * @return Sanitizing Jackson Module bean
     */
    @Bean
    public Module sanitizingJacksonModule() {
        SimpleModule module = new SimpleModule("SanitizingModule");
        module.addDeserializer(String.class, new SanitizingStringDeserializer());
        module.setDeserializerModifier(new SanitizingDeserializerModifier());
        return module;
    }

    /**
     * Explicit primary ObjectMapper bean ensuring all modules and sanitizers are active across Spring MVC.
     *
     * @return Configured primary ObjectMapper
     */
    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        SimpleModule module = new SimpleModule("SanitizingModule");
        module.addDeserializer(String.class, new SanitizingStringDeserializer());
        module.setDeserializerModifier(new SanitizingDeserializerModifier());
        mapper.registerModule(module);
        return mapper;
    }
}
