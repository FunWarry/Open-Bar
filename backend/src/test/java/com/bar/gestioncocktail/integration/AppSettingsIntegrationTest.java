package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.model.DefaultTheme;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack integration tests for AppSettings endpoints and operational alert thresholds.
 */
class AppSettingsIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("GET /api/settings - public endpoint returns settings with alert thresholds and currency")
    void getSettings_publicEndpoint_returnsSettingsWithAlertThresholds() throws Exception {
        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryColor").isNotEmpty())
                .andExpect(jsonPath("$.establishmentName").isNotEmpty())
                .andExpect(jsonPath("$.currencyCode").isNotEmpty())
                .andExpect(jsonPath("$.currencySymbol").isNotEmpty())
                .andExpect(jsonPath("$.currencyPosition").isNotEmpty())
                .andExpect(jsonPath("$.tempsAlerteWarningMinutes").isNumber())
                .andExpect(jsonPath("$.tempsAlerteCommandeMinutes").isNumber())
                .andExpect(jsonPath("$.tempsAlerteCritiqueCommandeMinutes").isNumber());
    }

    @Test
    @DisplayName("PUT /api/settings - admin can update alert thresholds, branding, and currency")
    void updateSettings_asAdmin_updatesAndReturnsNewSettings() throws Exception {
        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
                "#1a56db",
                "#1e429f",
                "https://example.com/bar-logo.png",
                "OpenBar Central",
                DefaultTheme.DARK,
                "USD",
                "$",
                com.bar.gestioncocktail.model.CurrencyPosition.BEFORE,
                2,
                4,
                8
        );

        mockMvc.perform(put("/api/settings")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.establishmentName").value("OpenBar Central"))
                .andExpect(jsonPath("$.primaryColor").value("#1a56db"))
                .andExpect(jsonPath("$.currencyCode").value("USD"))
                .andExpect(jsonPath("$.currencySymbol").value("$"))
                .andExpect(jsonPath("$.currencyPosition").value("BEFORE"))
                .andExpect(jsonPath("$.tempsAlerteWarningMinutes").value(2))
                .andExpect(jsonPath("$.tempsAlerteCommandeMinutes").value(4))
                .andExpect(jsonPath("$.tempsAlerteCritiqueCommandeMinutes").value(8));
    }

    @Test
    @DisplayName("PUT /api/settings - manager can update alert thresholds, branding, and currency")
    void updateSettings_asManager_updatesAndReturnsNewSettings() throws Exception {
        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
                "#6c7fe8",
                "#5a68d6",
                null,
                "OpenBar Manager Hub",
                DefaultTheme.DARK,
                "GBP",
                "£",
                com.bar.gestioncocktail.model.CurrencyPosition.BEFORE,
                3,
                6,
                12
        );

        mockMvc.perform(put("/api/settings")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.establishmentName").value("OpenBar Manager Hub"))
                .andExpect(jsonPath("$.currencyCode").value("GBP"))
                .andExpect(jsonPath("$.currencySymbol").value("£"))
                .andExpect(jsonPath("$.currencyPosition").value("BEFORE"))
                .andExpect(jsonPath("$.tempsAlerteWarningMinutes").value(3))
                .andExpect(jsonPath("$.tempsAlerteCommandeMinutes").value(6))
                .andExpect(jsonPath("$.tempsAlerteCritiqueCommandeMinutes").value(12));
    }

    @Test
    @DisplayName("PUT /api/settings - server role is forbidden (403)")
    void updateSettings_asServeur_returns403Forbidden() throws Exception {
        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
                "#6c7fe8",
                "#5a68d6",
                null,
                "Unauthorized Bar",
                DefaultTheme.DARK,
                null,
                null,
                null,
                3,
                5,
                10
        );

        mockMvc.perform(put("/api/settings")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/settings - barman role is forbidden (403)")
    void updateSettings_asBarman_returns403Forbidden() throws Exception {
        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
                "#6c7fe8",
                "#5a68d6",
                null,
                "Unauthorized Bar",
                DefaultTheme.DARK,
                null,
                null,
                null,
                3,
                5,
                10
        );

        mockMvc.perform(put("/api/settings")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getBarmanToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/settings - unauthenticated request returns 401")
    void updateSettings_unauthenticated_returns401Unauthorized() throws Exception {
        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
                "#6c7fe8",
                "#5a68d6",
                null,
                "Unauthorized Bar",
                DefaultTheme.DARK,
                null,
                null,
                null,
                3,
                5,
                10
        );

        mockMvc.perform(put("/api/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/settings - invalid threshold hierarchy (warning >= urgent) returns 400 Bad Request")
    void updateSettings_invalidThresholdHierarchy_returns400BadRequest() throws Exception {
        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
                "#6c7fe8",
                "#5a68d6",
                null,
                "OpenBar",
                DefaultTheme.DARK,
                null,
                null,
                null,
                6,
                5,
                10
        );

        mockMvc.perform(put("/api/settings")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
