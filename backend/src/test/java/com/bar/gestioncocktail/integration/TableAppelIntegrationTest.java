package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.TableAppelRequestDTO;
import com.bar.gestioncocktail.dto.TableAppelResponseDTO;
import com.bar.gestioncocktail.model.TableAppelType;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.TableAppelRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for patron table call alerts (assistance, bill request)
 * and waitstaff lifecycle management.
 */
class TableAppelIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private TableAppelRepository tableAppelRepository;

    private Long tableId;

    @BeforeEach
    void setUpTable() {
        tableAppelRepository.deleteAll();
        tableRepository.findByNumero(88).ifPresent(t -> {
            tableAppelRepository.deleteByTableId(t.getId());
            tableRepository.delete(t);
        });

        TableEntity table = new TableEntity();
        table.setNumero(88);
        table.setZone("Terrasse");
        table.setCapacite(4);
        table.setOccupee(true);
        table = tableRepository.save(table);
        this.tableId = table.getId();
    }

    @Test
    @DisplayName("fullTableAppelLifecycle_publicCallAndStaffAcknowledge_success")
    void fullTableAppelLifecycle_publicCallAndStaffAcknowledge_success() throws Exception {
        // 1. Anonymous patron triggers waiter call via public endpoint
        TableAppelRequestDTO callRequest = new TableAppelRequestDTO(TableAppelType.ASSISTANCE, "Besoin d'aide");
        MvcResult callResult = mockMvc.perform(post("/api/public/tables/" + tableId + "/appel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(callRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("ASSISTANCE"))
                .andExpect(jsonPath("$.statut").value("EN_ATTENTE"))
                .andReturn();

        TableAppelResponseDTO createdCall = objectMapper.readValue(
                callResult.getResponse().getContentAsString(), TableAppelResponseDTO.class);
        Long callId = createdCall.id();
        assertThat(callId).isNotNull();

        // 2. Staff views active table calls on dashboard
        mockMvc.perform(get("/api/tables/appels/actifs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(callId));

        // 3. Staff acknowledges the table call
        mockMvc.perform(post("/api/tables/" + tableId + "/appels/" + callId + "/acquitter")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("ACQUITTE"))
                .andExpect(jsonPath("$.acquittePar").value("serveur1"));

        // 4. Verify no more active calls for the table
        mockMvc.perform(get("/api/public/tables/" + tableId + "/appels/actifs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @DisplayName("billRequest_andDismissAllForTable_success")
    void billRequest_andDismissAllForTable_success() throws Exception {
        // 1. Anonymous patron triggers bill request
        TableAppelRequestDTO billRequest = new TableAppelRequestDTO(TableAppelType.ADDITION, "Addition par carte");
        mockMvc.perform(post("/api/public/tables/" + tableId + "/appel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(billRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("ADDITION"))
                .andExpect(jsonPath("$.statut").value("EN_ATTENTE"));

        // 2. Staff dismisses all calls for table
        mockMvc.perform(post("/api/tables/" + tableId + "/appels/acquitter-tous")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].statut").value("ACQUITTE"));
    }
}
