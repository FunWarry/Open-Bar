package com.bar.gestioncocktail.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link ActuatorForwardController}.
 */
@ExtendWith(MockitoExtension.class)
class ActuatorForwardControllerTest {

    @Mock
    private DataSource dataSource;

    @Mock
    private Connection connection;

    @Mock
    private DatabaseMetaData metaData;

    @Test
    @DisplayName("getHealth - returns 200 UP when database connection is valid")
    void getHealth_returnsUpWhenValid() throws SQLException {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(true);
        when(connection.getMetaData()).thenReturn(metaData);
        when(metaData.getDatabaseProductName()).thenReturn("PostgreSQL");
        when(metaData.getDatabaseProductVersion()).thenReturn("16.0");

        ActuatorForwardController controller = new ActuatorForwardController(dataSource, "1.0.0");
        ResponseEntity<Map<String, Object>> response = controller.getHealth();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).containsEntry("status", "UP");
        assertThat(response.getBody()).containsKey("components");
    }

    @Test
    @DisplayName("getHealth - returns 503 DOWN with redacted error when database connection throws SQLException")
    void getHealth_returnsDownWhenException() throws SQLException {
        when(dataSource.getConnection()).thenThrow(new SQLException("Connection refused to internal host 10.0.0.12:5432"));

        ActuatorForwardController controller = new ActuatorForwardController(dataSource, "1.0.0");
        ResponseEntity<Map<String, Object>> response = controller.getHealth();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).containsEntry("status", "DOWN");
        assertThat(response.getBody().toString())
                .doesNotContain("10.0.0.12")
                .contains("Database connection check failed");
    }

    @Test
    @DisplayName("getInfo - returns 200 with application version and java runtime info")
    void getInfo_returnsInfoDetails() {
        ActuatorForwardController controller = new ActuatorForwardController(dataSource, "1.0.0");
        ResponseEntity<Map<String, Object>> response = controller.getInfo();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).containsKey("app");
        assertThat(response.getBody()).containsKey("java");
    }
}
