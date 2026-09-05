package com.bar.gestioncocktail.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link DatabaseSchemaMigrationService}.
 */
@ExtendWith(MockitoExtension.class)
class DatabaseSchemaMigrationServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private DatabaseSchemaMigrationService databaseSchemaMigrationService;

    @Test
    @DisplayName("Should run schema migrations successfully on startup")
    void shouldRunSchemaMigrationsSuccessfully() {
        databaseSchemaMigrationService.run(new DefaultApplicationArguments(new String[0]));

        verify(jdbcTemplate, atLeast(5)).execute(anyString());
    }

    @Test
    @DisplayName("Should handle database exception gracefully during migration")
    void shouldHandleExceptionGracefully() {
        doThrow(new RuntimeException("Database error")).when(jdbcTemplate).execute(anyString());

        databaseSchemaMigrationService.migrateLegacyColumns();

        verify(jdbcTemplate, times(1)).execute(anyString());
    }

    @Test
    @DisplayName("Should do nothing when jdbcTemplate is null")
    void shouldDoNothingWhenJdbcTemplateIsNull() {
        DatabaseSchemaMigrationService nullService = new DatabaseSchemaMigrationService(null);
        org.junit.jupiter.api.Assertions.assertDoesNotThrow(nullService::migrateLegacyColumns);
    }
}
