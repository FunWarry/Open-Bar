package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.StockWasteRequestDTO;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.StockWasteReason;
import com.bar.gestioncocktail.repository.IngredientRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack integration tests for stock waste, breakage, and complimentary drink loss tracking.
 */
class StockWasteIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private IngredientRepository ingredientRepository;

    @Test
    @DisplayName("recordStockWaste_fullWorkflow_deductsInventoryAndUpdatesSummary")
    void recordStockWaste_fullWorkflow_deductsInventoryAndUpdatesSummary() throws Exception {
        // 1. Create a test ingredient with known initial stock
        Ingredient ingredient = new Ingredient();
        ingredient.setNom("Rhum Blanc Test Waste");
        ingredient.setQuantiteStock(new BigDecimal("20.00"));
        ingredient.setSeuilAlerte(new BigDecimal("5.00"));
        ingredient.setUniteMesure("cl");
        ingredient.setPrixUnitaire(new BigDecimal("0.50")); // 0.50 EUR per cl
        Ingredient savedIngredient = ingredientRepository.save(ingredient);
        Long ingredientId = savedIngredient.getId();

        // 2. Barman declares 4 cl broken bottle (CASSE)
        StockWasteRequestDTO wasteRequest = new StockWasteRequestDTO(
                ingredientId,
                new BigDecimal("4.00"),
                StockWasteReason.CASSE,
                "Bottle slipped during service"
        );

        mockMvc.perform(post("/api/stock/waste")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getBarmanToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wasteRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ingredientId").value(ingredientId))
                .andExpect(jsonPath("$.ingredientNom").value("Rhum Blanc Test Waste"))
                .andExpect(jsonPath("$.quantity").value(4.00))
                .andExpect(jsonPath("$.reason").value("CASSE"))
                .andExpect(jsonPath("$.cost").value(2.00))
                .andExpect(jsonPath("$.reportedByUsername").value("barman1"));

        // 3. Verify stock was deducted in database (20.00 - 4.00 = 16.00)
        Ingredient updatedIngredient = ingredientRepository.findById(ingredientId).orElseThrow();
        assertThat(updatedIngredient.getQuantiteStock()).isEqualByComparingTo("16.00");

        // 4. Verify movement appears in recent movements list
        mockMvc.perform(get("/api/stock/movements")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.ingredientId == " + ingredientId + ")].reason").value("CASSE"));

        // 5. Verify waste summary reflects loss breakdown and financial cost
        mockMvc.perform(get("/api/stock/waste/summary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lossValueByReason.CASSE").exists())
                .andExpect(jsonPath("$.totalQuantityLost").isNumber())
                .andExpect(jsonPath("$.totalLossValue").isNumber());
    }

    @Test
    @DisplayName("recordStockWaste_insufficientStock_returnsBadRequest")
    void recordStockWaste_insufficientStock_returnsBadRequest() throws Exception {
        Ingredient ingredient = new Ingredient();
        ingredient.setNom("Sirop Test Waste Insufficient");
        ingredient.setQuantiteStock(new BigDecimal("2.00"));
        ingredient.setSeuilAlerte(new BigDecimal("1.00"));
        ingredient.setUniteMesure("cl");
        ingredient.setPrixUnitaire(new BigDecimal("0.10"));
        Ingredient saved = ingredientRepository.save(ingredient);

        // Attempt to declare 5 cl waste when only 2 cl available
        StockWasteRequestDTO excessiveRequest = new StockWasteRequestDTO(
                saved.getId(),
                new BigDecimal("5.00"),
                StockWasteReason.PEREMPTION,
                "Expired syrup batch"
        );

        mockMvc.perform(post("/api/stock/waste")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getBarmanToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(excessiveRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("recordStockWaste_unauthorizedRole_returnsForbidden")
    void recordStockWaste_unauthorizedRole_returnsForbidden() throws Exception {
        Ingredient ingredient = new Ingredient();
        ingredient.setNom("Vodka Test Role");
        ingredient.setQuantiteStock(new BigDecimal("10.00"));
        ingredient.setSeuilAlerte(new BigDecimal("2.00"));
        ingredient.setUniteMesure("cl");
        Ingredient saved = ingredientRepository.save(ingredient);

        StockWasteRequestDTO forbiddenRequest = new StockWasteRequestDTO(
                saved.getId(),
                new BigDecimal("1.00"),
                StockWasteReason.DEGUSTATION_STAFF,
                "Staff drink"
        );

        mockMvc.perform(post("/api/stock/waste")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(forbiddenRequest)))
                .andExpect(status().isForbidden());
    }
}
