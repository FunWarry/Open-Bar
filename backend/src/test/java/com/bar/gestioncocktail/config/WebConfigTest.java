package com.bar.gestioncocktail.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class WebConfigTest {

    @Test
    @DisplayName("addResourceHandlers - configures /uploads/** resource mapping")
    void addResourceHandlers_registersHandler() {
        WebConfig webConfig = new WebConfig();
        ResourceHandlerRegistry registry = mock(ResourceHandlerRegistry.class);
        ResourceHandlerRegistration registration = mock(ResourceHandlerRegistration.class);

        when(registry.addResourceHandler("/uploads/**")).thenReturn(registration);
        when(registration.addResourceLocations(anyString())).thenReturn(registration);

        webConfig.addResourceHandlers(registry);

        verify(registry).addResourceHandler("/uploads/**");
        verify(registration).addResourceLocations(contains("uploads"));
    }
}
