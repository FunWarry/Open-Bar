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

    @Test
    @DisplayName("factureSplitSettlement_persistenceAndRetrieval_success")
    void factureSplitSettlement_persistenceAndRetrieval_success() throws Exception {
        TableEntity table = tableRepository.findAll().stream().findFirst().orElseGet(() -> {
            TableEntity t = new TableEntity();
            t.setNumero(2);
            t.setZone("Interieur");
            t.setCapacite(4);
            return tableRepository.save(t);
        });

        Facture newFacture = new Facture();
        newFacture.setNumero("FACT-SPLIT-" + System.currentTimeMillis());
        newFacture.setTable(table);
        newFacture.setTotal(new BigDecimal("40.00"));
        newFacture.setTotalHT(new BigDecimal("33.33"));
        newFacture.setTotalVAT(new BigDecimal("6.67"));
        newFacture.setTotalTTC(new BigDecimal("40.00"));
        newFacture.setDateFacture(LocalDateTime.now());
        newFacture.setReglee(false);

        FactureItem fi1 = new FactureItem();
        fi1.setFacture(newFacture);
        fi1.setDescription("Gin Tonic");
        fi1.setQuantite(2);
        fi1.setPrixUnitaire(new BigDecimal("10.00"));
        fi1.setTotal(new BigDecimal("20.00"));

        FactureItem fi2 = new FactureItem();
        fi2.setFacture(newFacture);
        fi2.setDescription("Planche Mixte");
        fi2.setQuantite(1);
        fi2.setPrixUnitaire(new BigDecimal("20.00"));
        fi2.setTotal(new BigDecimal("20.00"));

        newFacture.setItems(List.of(fi1, fi2));
        Facture savedFacture = factureRepository.save(newFacture);
        Long factureId = savedFacture.getId();

        // Part 1 settlement: 20 EUR by CARTE
        com.bar.gestioncocktail.dto.EncaisserPartRequest part1 = new com.bar.gestioncocktail.dto.EncaisserPartRequest(
                "Alice",
                1,
                2,
                new BigDecimal("20.00"),
                new BigDecimal("2.00"),
                new BigDecimal("22.00"),
                "CARTE",
                "EGAL",
                List.of()
        );

        mockMvc.perform(post("/api/factures/" + factureId + "/split/encaisser")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(part1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomConvive").value("Alice"))
                .andExpect(jsonPath("$.partIndex").value(1))
                .andExpect(jsonPath("$.modePaiement").value("CARTE"));

        // Part 2 settlement: 20 EUR by ESPECES -> Completes the 40.00 EUR total!
        com.bar.gestioncocktail.dto.EncaisserPartRequest part2 = new com.bar.gestioncocktail.dto.EncaisserPartRequest(
                "Bob",
                2,
                2,
                new BigDecimal("20.00"),
                BigDecimal.ZERO,
                new BigDecimal("20.00"),
                "ESPECES",
                "EGAL",
                List.of()
        );

        mockMvc.perform(post("/api/factures/" + factureId + "/split/encaisser")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(part2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomConvive").value("Bob"))
                .andExpect(jsonPath("$.partIndex").value(2));

        // Verify retrieval of all settlements
        mockMvc.perform(get("/api/factures/" + factureId + "/reglements")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].nomConvive").value("Alice"))
                .andExpect(jsonPath("$[1].nomConvive").value("Bob"));

        // Verify invoice is now settled with MIXTE_SPLIT
        mockMvc.perform(get("/api/factures/" + factureId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reglee").value(true))
                .andExpect(jsonPath("$.modePaiement").value("MIXTE_SPLIT"))
                .andExpect(jsonPath("$.reglements.length()").value(2));
    }
}
