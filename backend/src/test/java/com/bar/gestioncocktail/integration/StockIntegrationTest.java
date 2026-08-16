package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.repository.IngredientRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;

import java.math.BigDecimal;

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
        Ingredient ingredient = ingredientRepository.findAll().stream().findFirst().orElseGet(() -> {
            Ingredient ing = new Ingredient();
            ing.setNom("Menthe Test Stock");
            ing.setQuantiteStock(new BigDecimal("5.00"));
            ing.setSeuilAlerte(new BigDecimal("2.00"));
            ing.setUniteMesure("feuilles");
            return ingredientRepository.save(ing);
        });
        Long ingredientId = ingredient.getId();

        // 1. Update stock to 0 (out of stock / alerting)
        mockMvc.perform(put("/api/ingredients/" + ingredientId + "/stock")
                        .param("quantite", "0.00")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getBarmanToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantiteStock").value(0.00));

        // 2. Set alert threshold
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
