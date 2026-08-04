package com.bar.gestioncocktail.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.core.env.Environment;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

/**
 * Unit tests for DatabaseAutoCreationConfig.
 */
@ExtendWith(MockitoExtension.class)
class DatabaseAutoCreationConfigTest {

    @Mock
    private Environment environment;

    @Mock
    private ConfigurableListableBeanFactory beanFactory;

    @Test
    @DisplayName("databaseAutoCreator returns non-null BeanFactoryPostProcessor")
    void databaseAutoCreator_returnsNonNullProcessor() {
        BeanFactoryPostProcessor processor = DatabaseAutoCreationConfig.databaseAutoCreator(environment);
        assertNotNull(processor);
    }

    @Test
    @DisplayName("postProcessBeanFactory executes safely with null spring.datasource.url")
    void postProcessBeanFactory_handlesNullUrl() {
        when(environment.getProperty("spring.datasource.url")).thenReturn(null);
        BeanFactoryPostProcessor processor = DatabaseAutoCreationConfig.databaseAutoCreator(environment);

        assertDoesNotThrow(() -> processor.postProcessBeanFactory(beanFactory));
    }

    @Test
    @DisplayName("postProcessBeanFactory executes safely with non-PostgreSQL url")
    void postProcessBeanFactory_handlesNonPostgresUrl() {
        when(environment.getProperty("spring.datasource.url")).thenReturn("jdbc:h2:mem:testdb");
        BeanFactoryPostProcessor processor = DatabaseAutoCreationConfig.databaseAutoCreator(environment);

        assertDoesNotThrow(() -> processor.postProcessBeanFactory(beanFactory));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "jdbc:postgresql://localhost:5433/invalid$database!name",
            "jdbc:postgresql://localhost:5433/gestion_cocktail_test",
            "jdbc:postgresql://127.0.0.1:5433/gestion_cocktail_dev?ssl=false"
    })
    @DisplayName("postProcessBeanFactory executes safely with various PostgreSQL URLs")
    void postProcessBeanFactory_handlesPostgresUrls(String url) {
        when(environment.getProperty("spring.datasource.url")).thenReturn(url);
        when(environment.getProperty("spring.datasource.username", "postgres")).thenReturn("postgres");
        when(environment.getProperty("spring.datasource.password", "postgres")).thenReturn("postgres");
        BeanFactoryPostProcessor processor = DatabaseAutoCreationConfig.databaseAutoCreator(environment);

        assertDoesNotThrow(() -> processor.postProcessBeanFactory(beanFactory));
    }
}
