package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.repository.IngredientRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for ingredient stock management and alert thresholds.
 */
class StockIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private IngredientRepository ingredientRepository;

    @Test
    @DisplayName("stockManagement_updateStockAndAlertThreshold_success")
    void stockManagement_updateStockAndAlertThreshold_success() throws Exception {
        Long ingredientId = ingredientRepository.findAll().getFirst().getId();

        // 1. Update stock
        mockMvc.perform(put("/api/ingredients/" + ingredientId + "/stock")
                        .param("quantite", "5.00")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getBarmanToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stockActuel").value(5.00));

        // 2. Set alert threshold higher than current stock
        mockMvc.perform(put("/api/ingredients/" + ingredientId + "/seuil-alerte")
                        .param("seuil", "10.00")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getBarmanToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seuilAlerte").value(10.00));

        // 3. Verify ingredient appears in alert endpoint
        mockMvc.perform(get("/api/ingredients/seuil-alerte")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getBarmanToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + ingredientId + ")]").exists());
    }
}
