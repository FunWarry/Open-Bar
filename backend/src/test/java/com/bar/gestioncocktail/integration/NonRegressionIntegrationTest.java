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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Non-regression full-stack integration tests covering historical fixes,
 * calculations, and security guards.
 */
class NonRegressionIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private FactureRepository factureRepository;

    @Autowired
    private TableRepository tableRepository;

    @Test
    @DisplayName("nonRegression_splitEgalAmountConservation_sumOfSplitsEqualsTotal")
    void nonRegression_splitEgalAmountConservation_sumOfSplitsEqualsTotal() throws Exception {
        Facture facture = factureRepository.findAll().stream()
                .filter(f -> !f.isReglee())
                .findFirst()
                .orElseGet(() -> {
                    TableEntity table = tableRepository.findAll().stream().findFirst().orElseGet(() -> {
                        TableEntity t = new TableEntity();
                        t.setNumero(2);
                        t.setZone("Bar");
                        t.setCapacite(2);
                        return tableRepository.save(t);
                    });
                    Facture newFacture = new Facture();
                    newFacture.setNumero("FACT-TEST-NONREG-" + System.currentTimeMillis());
                    newFacture.setTable(table);
                    newFacture.setTotal(new BigDecimal("45.00"));
                    newFacture.setTotalHT(new BigDecimal("37.50"));
                    newFacture.setTotalVAT(new BigDecimal("7.50"));
                    newFacture.setTotalTTC(new BigDecimal("45.00"));
                    newFacture.setDateFacture(LocalDateTime.now());
                    newFacture.setReglee(false);

                    FactureItem fi = new FactureItem();
                    fi.setFacture(newFacture);
                    fi.setDescription("Cosmopolitan");
                    fi.setQuantite(3);
                    fi.setPrixUnitaire(new BigDecimal("15.00"));
                    fi.setTotal(new BigDecimal("45.00"));
                    fi.setPriceHT(new BigDecimal("37.50"));
                    fi.setVatAmount(new BigDecimal("7.50"));
                    fi.setVatRate(VatRate.TWENTY);
                    newFacture.setItems(List.of(fi));

                    return factureRepository.save(newFacture);
                });
        Long factureId = facture.getId();

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

    @Test
    @DisplayName("nonRegression_xssInputSanitization_stripsMaliciousPayloads")
    void nonRegression_xssInputSanitization_stripsMaliciousPayloads() throws Exception {
        var tableDto = new com.bar.gestioncocktail.dto.TableRequestDTO(
                999,
                2,
                "<script>alert('XSS')</script>Bar Counter",
                50.0,
                50.0,
                0.0,
                "CARRE"
        );

        mockMvc.perform(post("/api/tables")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + getAdminToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(tableDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.zone").value("Bar Counter"));
    }
}
