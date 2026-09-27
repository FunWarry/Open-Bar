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
    void databaseAutoCreatorReturnsNonNullProcessor() {
        BeanFactoryPostProcessor processor = DatabaseAutoCreationConfig.databaseAutoCreator(environment);
        assertNotNull(processor);
    }

    @Test
    @DisplayName("postProcessBeanFactory executes safely with null spring.datasource.url")
    void postProcessBeanFactoryHandlesNullUrl() {
        when(environment.getProperty("spring.datasource.url")).thenReturn(null);
        BeanFactoryPostProcessor processor = DatabaseAutoCreationConfig.databaseAutoCreator(environment);

        assertDoesNotThrow(() -> processor.postProcessBeanFactory(beanFactory));
    }

    @Test
    @DisplayName("postProcessBeanFactory executes safely with non-PostgreSQL url")
    void postProcessBeanFactoryHandlesNonPostgresUrl() {
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
    void postProcessBeanFactoryHandlesPostgresUrls(String url) {
        when(environment.getProperty("spring.datasource.url")).thenReturn(url);
        org.mockito.Mockito.lenient().when(environment.getProperty("spring.datasource.username", "postgres")).thenReturn("postgres");
        org.mockito.Mockito.lenient().when(environment.getProperty("spring.datasource.password", "postgres")).thenReturn("postgres");
        BeanFactoryPostProcessor processor = DatabaseAutoCreationConfig.databaseAutoCreator(environment);

        assertDoesNotThrow(() -> processor.postProcessBeanFactory(beanFactory));
    }

    @Test
    @DisplayName("DbStatus enum defines all required connection states")
    void dbStatusDefinesAllRequiredStates() {
        DatabaseAutoCreationConfig.DbStatus[] statuses = DatabaseAutoCreationConfig.DbStatus.values();
        org.assertj.core.api.Assertions.assertThat(statuses).containsExactlyInAnyOrder(
                DatabaseAutoCreationConfig.DbStatus.READY,
                DatabaseAutoCreationConfig.DbStatus.SERVER_UP_NO_DB,
                DatabaseAutoCreationConfig.DbStatus.UNREACHABLE
        );
    }

    @Test
    @DisplayName("probeDatabaseStatus returns UNREACHABLE for unreachable host")
    void probeDatabaseStatusReturnsUnreachableForInvalidHost() {
        DatabaseAutoCreationConfig.ProbeResult result = DatabaseAutoCreationConfig.probeDatabaseStatus(
                "jdbc:postgresql://192.0.2.1:5433/unreachable_db", "postgres", "postgres");
        org.assertj.core.api.Assertions.assertThat(result.status()).isEqualTo(DatabaseAutoCreationConfig.DbStatus.UNREACHABLE);
        org.assertj.core.api.Assertions.assertThat(result.errorMessage()).isNotBlank();
    }

    @Test
    @DisplayName("postProcessBeanFactory aborts with IllegalStateException when wait-for-connection times out")
    void postProcessBeanFactoryThrowsIllegalStateExceptionOnTimeout() {
        when(environment.getProperty("spring.datasource.url")).thenReturn("jdbc:postgresql://192.0.2.1:5433/gestion_cocktail_test");
        org.mockito.Mockito.lenient().when(environment.getProperty("spring.datasource.username", "postgres")).thenReturn("postgres");
        org.mockito.Mockito.lenient().when(environment.getProperty("spring.datasource.password", "postgres")).thenReturn("postgres");
        when(environment.getProperty("openbar.database.wait-for-connection", Boolean.class, false)).thenReturn(true);
        when(environment.getProperty("openbar.database.poll-interval-seconds", Integer.class)).thenReturn(1);
        when(environment.getProperty("openbar.database.max-wait-seconds", Integer.class)).thenReturn(1);

        BeanFactoryPostProcessor processor = DatabaseAutoCreationConfig.databaseAutoCreator(environment);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> processor.postProcessBeanFactory(beanFactory))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("is not reachable after");
    }
}
