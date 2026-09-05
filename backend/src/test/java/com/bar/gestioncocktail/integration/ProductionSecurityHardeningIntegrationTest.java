package com.bar.gestioncocktail.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests validating production security hardening:
 * HTTP 500 error message obfuscation and strict CORS origin validation.
 */
@ActiveProfiles({"test", "prod"})
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5433}/${DB_NAME:gestion_cocktail_test}?sslmode=disable",
        "spring.datasource.username=postgres",
        "spring.datasource.password=${TEST_DB_PASSWORD:${POSTGRES_PASSWORD:${DB_PASSWORD:KZiXrsAw/asRtE8YJuxA8LkWtDXK5rPBmiriAHAu+7Q=}}}",
        "openbar.cors.allowed-origin-patterns=https://open-bar.freeboxos.fr,http://localhost:4200",
        "server.error.include-stacktrace=never",
        "server.error.include-message=never"
})
@Import(ProductionSecurityHardeningIntegrationTest.FaultyTestController.class)
class ProductionSecurityHardeningIntegrationTest extends BaseIntegrationTest {

    @RestController
    @RequestMapping("/api/test-prod-fault")
    static class FaultyTestController {
        @GetMapping("/unhandled")
        public String triggerUnhandledError() {
            throw new RuntimeException("CRITICAL: Database schema leak table=pg_shadow host=10.0.0.99");
        }
    }

    @Test
    @DisplayName("handleGenericException - obfuscates internal error details in production profile")
    void handleGenericException_obfuscatesMessageInProduction() throws Exception {
        mockMvc.perform(get("/api/test-prod-fault/unhandled")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken()))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andExpect(jsonPath("$.message").value("An internal server error occurred"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("pg_shadow"))));
    }

    @Test
    @DisplayName("corsPreflight - allows authorized production PWA origin")
    void corsPreflight_allowsAuthorizedOrigin() throws Exception {
        mockMvc.perform(options("/api/cocktails")
                        .header(HttpHeaders.ORIGIN, "https://open-bar.freeboxos.fr")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization,Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://open-bar.freeboxos.fr"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    @DisplayName("corsPreflight - allows authorized local frontend origin")
    void corsPreflight_allowsAuthorizedLocalOrigin() throws Exception {
        mockMvc.perform(options("/api/cocktails")
                        .header(HttpHeaders.ORIGIN, "http://localhost:4200")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization,Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:4200"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    @DisplayName("corsPreflight - rejects unauthorized attacker origin in production profile")
    void corsPreflight_rejectsUnauthorizedOrigin() throws Exception {
        mockMvc.perform(options("/api/cocktails")
                        .header(HttpHeaders.ORIGIN, "https://evil-attacker.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization,Content-Type"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }
}
