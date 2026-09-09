package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.CommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests validating offline queue order synchronization and backend idempotency.
 */
class CommandeOfflineSyncIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private CocktailRepository cocktailRepository;

    @Autowired
    private CommandeRepository commandeRepository;

    @Test
    @DisplayName("Idempotency: creating order with clientRequestId persists clientRequestId and returns it")
    void createOrder_withClientRequestId_success() throws Exception {
        TableEntity table = new TableEntity();
        table.setNumero(941);
        table.setZone("Terrasse Sync Test");
        table.setCapacite(4);
        table = tableRepository.save(table);

        Cocktail cocktail = new Cocktail();
        cocktail.setNom("Spritz Offline Test");
        cocktail.setPrix(new BigDecimal("9.50"));
        cocktail.setCategorie(CocktailCategorie.SANS_ALCOOL);
        cocktail = cocktailRepository.save(cocktail);

        CommandeItemRequestDTO itemDTO = new CommandeItemRequestDTO(
                cocktail.getId(),
                null,
                2,
                new BigDecimal("9.50"),
                "Extra glace",
                false
        );

        String clientRequestId = "sync-uuid-" + System.currentTimeMillis();
        CommandeRequestDTO request = new CommandeRequestDTO(
                table.getId(),
                null,
                "Test order queued offline",
                BigDecimal.ZERO,
                clientRequestId,
                List.of(itemDTO)
        );

        MvcResult result = mockMvc.perform(post("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.clientRequestId").value(clientRequestId))
                .andExpect(jsonPath("$.statut").value("EN_ATTENTE"))
                .andReturn();

        CommandeResponseDTO response = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                CommandeResponseDTO.class
        );

        assertThat(response.id()).isNotNull();
        assertThat(response.clientRequestId()).isEqualTo(clientRequestId);
        assertThat(response.total()).isEqualByComparingTo(new BigDecimal("19.00"));
        assertThat(response.items()).hasSize(1);
    }

    @Test
    @DisplayName("Idempotency: re-transmitting same clientRequestId returns existing order without creating duplicate")
    void createOrder_idempotency_secondTransmissionReturnsSameOrder() throws Exception {
        TableEntity table = new TableEntity();
        table.setNumero(942);
        table.setZone("Terrasse Replay Test");
        table.setCapacite(2);
        table = tableRepository.save(table);

        Cocktail cocktail = new Cocktail();
        cocktail.setNom("Negroni Replay Test");
        cocktail.setPrix(new BigDecimal("11.00"));
        cocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        cocktail = cocktailRepository.save(cocktail);

        CommandeItemRequestDTO itemDTO = new CommandeItemRequestDTO(
                cocktail.getId(),
                null,
                1,
                new BigDecimal("11.00"),
                "No orange",
                true
        );

        String clientRequestId = "replay-uuid-998877";
        CommandeRequestDTO request = new CommandeRequestDTO(
                table.getId(),
                null,
                "Initial sync attempt",
                BigDecimal.ZERO,
                clientRequestId,
                List.of(itemDTO)
        );

        // First transmission (initial)
        MvcResult firstResult = mockMvc.perform(post("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientRequestId").value(clientRequestId))
                .andReturn();

        CommandeResponseDTO firstResponse = objectMapper.readValue(
                firstResult.getResponse().getContentAsString(),
                CommandeResponseDTO.class
        );

        long initialTotalOrdersCount = commandeRepository.count();

        // Second transmission (e.g. Wi-Fi dropped during response, waiter device retries background sync)
        MvcResult retryResult = mockMvc.perform(post("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientRequestId").value(clientRequestId))
                .andReturn();

        CommandeResponseDTO retryResponse = objectMapper.readValue(
                retryResult.getResponse().getContentAsString(),
                CommandeResponseDTO.class
        );

        // Assert that the exact same order was returned without duplicate rows created
        assertThat(retryResponse.id()).isEqualTo(firstResponse.id());
        assertThat(retryResponse.clientRequestId()).isEqualTo(firstResponse.clientRequestId());
        assertThat(retryResponse.total()).isEqualByComparingTo(firstResponse.total());
        assertThat(commandeRepository.count()).isEqualTo(initialTotalOrdersCount);
    }
}
