package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.EstablishmentModulesUpdateRequest;
import com.bar.gestioncocktail.dto.PublicCommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.PublicCommandeRequestDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack integration tests for modular capability feature flags and establishment module endpoints.
 */
class EstablishmentModulesIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("GET /api/establishment/modules - public endpoint returns all capability flags without authentication")
    void getModules_publicEndpoint_returnsAllFlags() throws Exception {
        mockMvc.perform(get("/api/establishment/modules"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuisineKds").isBoolean())
                .andExpect(jsonPath("$.happyHour").isBoolean())
                .andExpect(jsonPath("$.employeeManagement").isBoolean())
                .andExpect(jsonPath("$.floorPlan").isBoolean())
                .andExpect(jsonPath("$.qrClientOrdering").isBoolean())
                .andExpect(jsonPath("$.stockTracking").isBoolean());
    }

    @Test
    @DisplayName("PUT /api/establishment/modules - unauthenticated request is rejected with 401")
    void updateModules_unauthenticated_returns401() throws Exception {
        EstablishmentModulesUpdateRequest request = new EstablishmentModulesUpdateRequest(
                false, true, false, true, false, true
        );

        mockMvc.perform(put("/api/establishment/modules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PUT /api/establishment/modules - SERVEUR role is rejected with 403 Forbidden")
    void updateModules_asServeur_returns403() throws Exception {
        EstablishmentModulesUpdateRequest request = new EstablishmentModulesUpdateRequest(
                false, true, false, true, false, true
        );

        mockMvc.perform(put("/api/establishment/modules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/establishment/modules - ADMIN can update modules, persistence and public intake guard are enforced")
    void updateModules_asAdmin_updatesAndEnforcesFeatureGuard() throws Exception {
        // 1. Disable QR_CLIENT_ORDERING as ADMIN
        EstablishmentModulesUpdateRequest disableQr = new EstablishmentModulesUpdateRequest(
                true, true, true, true, false, true
        );

        mockMvc.perform(put("/api/establishment/modules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(disableQr)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.qrClientOrdering").value(false))
                .andExpect(jsonPath("$.cuisineKds").value(true));

        // 2. Verify public GET returns qrClientOrdering = false
        mockMvc.perform(get("/api/establishment/modules"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.qrClientOrdering").value(false));

        // 3. Attempt to place public QR order when disabled -> 400 BusinessException
        PublicCommandeItemRequestDTO item = new PublicCommandeItemRequestDTO(1L, null, 1, "No sugar");
        PublicCommandeRequestDTO orderRequest = new PublicCommandeRequestDTO(1L, List.of(item), null);

        mockMvc.perform(post("/api/public/commandes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Customer QR ordering is currently disabled for this establishment."));

        // 4. Re-enable all modules
        EstablishmentModulesUpdateRequest enableAll = new EstablishmentModulesUpdateRequest(
                true, true, true, true, true, true
        );

        mockMvc.perform(put("/api/establishment/modules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(enableAll)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.qrClientOrdering").value(true));
    }
}
