package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.ClotureCaisseRequestDTO;
import com.bar.gestioncocktail.model.DailyCashClosure;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.DailyCashClosureRepository;
import com.bar.gestioncocktail.repository.FactureRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for daily cash register closure (Z-Report),
 * drawer reconciliation, sales locking, and official compliance exports (PDF, FEC).
 */
class DailyCashClosureIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private DailyCashClosureRepository closureRepository;

    @Autowired
    private FactureRepository factureRepository;

    @Autowired
    private TableRepository tableRepository;

    @Test
    @DisplayName("cloturerCaisse_nominalFlow_createsClosureAndVerifiesSalesLockingAndExports")
    void cloturerCaisse_nominalFlow_createsClosureAndVerifiesSalesLockingAndExports() throws Exception {
        LocalDate targetDate = LocalDate.now().minusDays(15);
        closureRepository.findByClosureDate(targetDate).ifPresent(closureRepository::delete);

        ClotureCaisseRequestDTO request = new ClotureCaisseRequestDTO(
                targetDate,
                new BigDecimal("150.00"),
                new BigDecimal("150.00"),
                Map.of("50e", 2, "20e", 2, "10e", 1),
                null
        );

        // 1. Manager performs cash register closure
        mockMvc.perform(post("/api/factures/recap/cloturer")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.closureNumber").value(startsWith("Z-")))
                .andExpect(jsonPath("$.closureDate").value(targetDate.toString()))
                .andExpect(jsonPath("$.openingFloat").value(150.0))
                .andExpect(jsonPath("$.countedCash").value(150.0))
                .andExpect(jsonPath("$.cashDiscrepancy").value(0.0))
                .andExpect(jsonPath("$.sha256Hash").isString());

        DailyCashClosure saved = closureRepository.findByClosureDate(targetDate).orElseThrow();
        assertThat(saved.getSha256Hash()).hasSize(64);
        Long closureId = saved.getId();

        // 2. Query closure by date
        mockMvc.perform(get("/api/factures/clotures/by-date")
                        .param("date", targetDate.toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(closureId))
                .andExpect(jsonPath("$.closureNumber").value(saved.getClosureNumber()));

        // 3. Download certified Z-report PDF
        mockMvc.perform(get("/api/factures/clotures/" + closureId + "/pdf")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, org.hamcrest.Matchers.containsString("attachment; filename=\"z-report-")));

        // 4. Download FEC accounting export
        mockMvc.perform(get("/api/factures/clotures/" + closureId + "/export/fec")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("JournalCode\tJournalLib")));

        // 5. Attempting to settle a bill on the closed date must be blocked by sales lock
        TableEntity table = tableRepository.findAll().stream().findFirst().orElseGet(() -> {
            TableEntity t = new TableEntity();
            t.setNumero(999);
            t.setZone("Salle");
            t.setCapacite(2);
            return tableRepository.save(t);
        });

        Facture oldFacture = new Facture();
        oldFacture.setNumero("FACT-LOCKED-" + System.currentTimeMillis());
        oldFacture.setTable(table);
        oldFacture.setTotal(new BigDecimal("20.00"));
        oldFacture.setTotalHT(new BigDecimal("16.67"));
        oldFacture.setTotalVAT(new BigDecimal("3.33"));
        oldFacture.setTotalTTC(new BigDecimal("20.00"));
        oldFacture.setDateFacture(targetDate.atTime(14, 0));
        oldFacture.setReglee(false);
        Facture persistedFacture = factureRepository.save(oldFacture);

        mockMvc.perform(post("/api/factures/" + persistedFacture.getId() + "/regler")
                        .param("modePaiement", "ESPECES")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already closed")));
    }

    @Test
    @DisplayName("cloturerCaisse_discrepancyWithoutReason_returnsBadRequest")
    void cloturerCaisse_discrepancyWithoutReason_returnsBadRequest() throws Exception {
        LocalDate date = LocalDate.now().minusDays(20);
        closureRepository.findByClosureDate(date).ifPresent(closureRepository::delete);

        ClotureCaisseRequestDTO request = new ClotureCaisseRequestDTO(
                date,
                new BigDecimal("100.00"),
                new BigDecimal("80.00"), // 20€ discrepancy with null reason
                Collections.emptyMap(),
                null
        );

        mockMvc.perform(post("/api/factures/recap/cloturer")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("justification note is mandatory")));
    }

    @Test
    @DisplayName("cloturerCaisse_unauthorizedRole_returnsForbidden")
    void cloturerCaisse_unauthorizedRole_returnsForbidden() throws Exception {
        ClotureCaisseRequestDTO request = new ClotureCaisseRequestDTO(
                LocalDate.now().minusDays(25),
                new BigDecimal("100.00"),
                new BigDecimal("100.00"),
                Collections.emptyMap(),
                null
        );

        mockMvc.perform(post("/api/factures/recap/cloturer")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
