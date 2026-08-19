package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.SplitEgalRequest;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.VatRate;
import com.bar.gestioncocktail.repository.FactureRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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

    @Autowired
    private TableRepository tableRepository;

    @Test
    @DisplayName("factureLifecycle_splitPdfAndSettlement_success")
    void factureLifecycle_splitPdfAndSettlement_success() throws Exception {
        Facture facture = factureRepository.findAll().stream()
                .filter(f -> !f.isReglee())
                .findFirst()
                .orElseGet(() -> {
                    TableEntity table = tableRepository.findAll().stream().findFirst().orElseGet(() -> {
                        TableEntity t = new TableEntity();
                        t.setNumero(1);
                        t.setZone("Terrasse");
                        t.setCapacite(4);
                        return tableRepository.save(t);
                    });
                    Facture newFacture = new Facture();
                    newFacture.setNumero("FACT-TEST-" + System.currentTimeMillis());
                    newFacture.setTable(table);
                    newFacture.setTotal(new BigDecimal("30.00"));
                    newFacture.setTotalHT(new BigDecimal("25.00"));
                    newFacture.setTotalVAT(new BigDecimal("5.00"));
                    newFacture.setTotalTTC(new BigDecimal("30.00"));
                    newFacture.setDateFacture(LocalDateTime.now());
                    newFacture.setReglee(false);

                    FactureItem fi = new FactureItem();
                    fi.setFacture(newFacture);
                    fi.setDescription("Mojito");
                    fi.setQuantite(2);
                    fi.setPrixUnitaire(new BigDecimal("15.00"));
                    fi.setTotal(new BigDecimal("30.00"));
                    fi.setPriceHT(new BigDecimal("25.00"));
                    fi.setVatAmount(new BigDecimal("5.00"));
                    fi.setVatRate(VatRate.TWENTY);
                    newFacture.setItems(List.of(fi));

                    return factureRepository.save(newFacture);
                });
        Long factureId = facture.getId();

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
