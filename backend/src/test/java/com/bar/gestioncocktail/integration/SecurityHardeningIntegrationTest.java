package com.bar.gestioncocktail.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for security hardening in dev/test profile:
 * verifies CORS preflight behavior and non-obfuscated diagnostic exception payload in test environment.
 */
@Import(SecurityHardeningIntegrationTest.FaultyTestController.class)
class SecurityHardeningIntegrationTest extends BaseIntegrationTest {

    @RestController
    @RequestMapping("/api/test-fault")
    static class FaultyTestController {
        @GetMapping("/unhandled")
        public String triggerUnhandledError() {
            throw new IllegalStateException("Test database connection failure on dev node");
        }
    }

    @Test
    @DisplayName("corsPreflight - allows preflight options request with authorization headers")
    void corsPreflight_allowsRequest() throws Exception {
        mockMvc.perform(options("/api/cocktails")
                        .header(HttpHeaders.ORIGIN, "http://localhost:4200")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization,Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:4200"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    @DisplayName("handleGenericException - returns descriptive exception message in test/dev environment")
    void handleGenericException_returnsDescriptiveMessageInDev() throws Exception {
        mockMvc.perform(get("/api/test-fault/unhandled")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken()))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andExpect(jsonPath("$.message").value("Test database connection failure on dev node"));
    }
}
