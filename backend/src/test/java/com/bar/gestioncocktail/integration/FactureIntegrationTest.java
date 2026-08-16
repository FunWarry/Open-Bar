package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.SplitEgalRequest;
import com.bar.gestioncocktail.repository.FactureRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for invoice lifecycle, bill splitting, and PDF generation.
 */
class FactureIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private FactureRepository factureRepository;

    @Test
    @DisplayName("factureLifecycle_splitPdfAndSettlement_success")
    void factureLifecycle_splitPdfAndSettlement_success() throws Exception {
        Long factureId = factureRepository.findAll().stream()
                .filter(f -> !f.isReglee())
                .findFirst()
                .orElseThrow()
                .getId();

        // 1. Equal bill split
        SplitEgalRequest splitRequest = new SplitEgalRequest(2);
        mockMvc.perform(post("/api/factures/" + factureId + "/split/egal")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(splitRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        // 2. Download PDF
        mockMvc.perform(get("/api/factures/" + factureId + "/pdf")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .accept(MediaType.APPLICATION_PDF))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));

        // 3. Settle invoice
        mockMvc.perform(post("/api/factures/" + factureId + "/regler")
                        .param("modePaiement", "CARTE")
                        .param("pourboire", "3.00")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reglee").value(true))
                .andExpect(jsonPath("$.modePaiement").value("CARTE"));
    }
}
