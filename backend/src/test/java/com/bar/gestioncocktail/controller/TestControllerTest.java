package com.bar.gestioncocktail.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class TestControllerTest {

    private final TestController controller = new TestController();

    @Test
    @DisplayName("healthCheck - returns 200 OK with up and running message")
    void healthCheck_returnsUpMessage() {
        ResponseEntity<String> response = controller.healthCheck();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo("Service is up and running");
    }

    @Test
    @DisplayName("testEndpoint - returns 200 OK with blocking message")
    void testEndpoint_returnsBlockingMessage() {
        ResponseEntity<String> response = controller.testEndpoint();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo("Test endpoint is blocking");
    }
}
