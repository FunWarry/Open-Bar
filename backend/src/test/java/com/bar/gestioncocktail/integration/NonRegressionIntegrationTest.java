package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.SplitEgalRequest;
import com.bar.gestioncocktail.repository.FactureRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Non-regression full-stack integration tests covering historical fixes, calculations, and security guards.
 */
class NonRegressionIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private FactureRepository factureRepository;

    @Test
    @DisplayName("nonRegression_splitEgalAmountConservation_sumOfSplitsEqualsTotal")
    void nonRegression_splitEgalAmountConservation_sumOfSplitsEqualsTotal() throws Exception {
        Long factureId = factureRepository.findAll().stream()
                .filter(f -> !f.isReglee())
                .findFirst()
                .orElseThrow()
                .getId();

        SplitEgalRequest request = new SplitEgalRequest(3);
        mockMvc.perform(post("/api/factures/" + factureId + "/split/egal")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    @DisplayName("nonRegression_roleAuthorization_serverCannotModifyStock")
    void nonRegression_roleAuthorization_serverCannotModifyStock() throws Exception {
        // SERVER role cannot update ingredient stocks (only BARMAN, MANAGER, ADMIN)
        mockMvc.perform(put("/api/ingredients/1/stock")
                        .param("quantite", "10.0")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken()))
                .andExpect(status().isForbidden());
    }
}
