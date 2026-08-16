package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.CommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableBar;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for order lifecycle (creation, item additions, status transitions).
 */
class CommandeIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private CocktailRepository cocktailRepository;

    @Test
    @DisplayName("fullOrderLifecycle_fromCreationToDelivery_success")
    void fullOrderLifecycle_fromCreationToDelivery_success() throws Exception {
        TableBar table = tableRepository.findAll().stream().findFirst().orElseGet(() -> {
            TableBar t = new TableBar();
            t.setNumero(1);
            t.setNom("Table 1");
            t.setCapacite(4);
            return tableRepository.save(t);
        });
        Long tableId = table.getId();

        Cocktail cocktail = cocktailRepository.findAll().stream().findFirst().orElseGet(() -> {
            Cocktail c = new Cocktail();
            c.setNom("Mojito Test");
            c.setPrix(new BigDecimal("8.50"));
            return cocktailRepository.save(c);
        });
        Long cocktailId = cocktail.getId();

        // 1. Create order
        CommandeRequestDTO createRequest = new CommandeRequestDTO(tableId, null, "Table order test", BigDecimal.ZERO);
        MvcResult createResult = mockMvc.perform(post("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("EN_ATTENTE"))
                .andReturn();

        CommandeResponseDTO createResponse = objectMapper.readValue(
                createResult.getResponse().getContentAsString(), CommandeResponseDTO.class
        );
        Long commandeId = createResponse.id();

        // 2. Add item line to order
        CommandeItemRequestDTO itemRequest = new CommandeItemRequestDTO(
                cocktailId, null, 2, new BigDecimal("8.50"), "Sans paille", false
        );
        mockMvc.perform(post("/api/commandes/" + commandeId + "/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(itemRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray());

        // 3. Advance status to EN_PREPARATION
        mockMvc.perform(put("/api/commandes/" + commandeId + "/statut")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getBarmanToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CommandeStatut.EN_PREPARATION)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("EN_PREPARATION"));

        // 4. Advance status to PRET
        mockMvc.perform(put("/api/commandes/" + commandeId + "/statut")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getBarmanToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CommandeStatut.PRET)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("PRET"));

        // 5. Advance status to LIVREE
        mockMvc.perform(put("/api/commandes/" + commandeId + "/statut")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CommandeStatut.LIVREE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("LIVREE"));

        // 6. Verify GET order details
        MvcResult getResult = mockMvc.perform(get("/api/commandes/" + commandeId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken()))
                .andExpect(status().isOk())
                .andReturn();

        CommandeResponseDTO finalOrder = objectMapper.readValue(
                getResult.getResponse().getContentAsString(), CommandeResponseDTO.class
        );
        assertThat(finalOrder.statut()).isEqualTo(CommandeStatut.LIVREE);
    }
}
