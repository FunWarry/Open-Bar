package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.CommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.PreparationStation;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test covering KDS multi-station order routing, item-level status progression,
 * station-filtered order retrieval, and automatic order status synchronization.
 */
class KdsStationRoutingIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private CocktailRepository cocktailRepository;

    @Test
    @DisplayName("kdsStationRouting_itemStatusProgressionAndStationFiltering_success")
    void kdsStationRouting_itemStatusProgressionAndStationFiltering_success() throws Exception {
        String adminAuth = "Bearer " + getAdminToken();

        // 1. Setup Table
        TableEntity table = new TableEntity();
        table.setNumero(777);
        table.setZone("Terrasse KDS");
        table.setCapacite(4);
        table = tableRepository.save(table);

        // 2. Setup Cocktails with different preparation stations
        Cocktail drink = new Cocktail();
        drink.setNom("Cocktail Bar KDS");
        drink.setPrix(new BigDecimal("9.00"));
        drink.setCategorie(CocktailCategorie.ALCOOLISE);
        drink.setStation(PreparationStation.BAR);
        drink = cocktailRepository.save(drink);

        Cocktail food = new Cocktail();
        food.setNom("Planche Kitchen KDS");
        food.setPrix(new BigDecimal("14.50"));
        food.setCategorie(CocktailCategorie.APERITIF);
        food.setStation(PreparationStation.KITCHEN);
        food = cocktailRepository.save(food);

        // 3. Create Order
        CommandeRequestDTO orderRequest = new CommandeRequestDTO(
                table.getId(),
                null,
                "Commande KDS test",
                BigDecimal.ZERO
        );

        MvcResult createResult = mockMvc.perform(post("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("EN_ATTENTE"))
                .andReturn();

        CommandeResponseDTO orderDto = objectMapper.readValue(
                createResult.getResponse().getContentAsString(),
                CommandeResponseDTO.class
        );
        Long orderId = orderDto.id();

        // 4. Add Bar drink item
        CommandeItemRequestDTO barItemReq = new CommandeItemRequestDTO(
                drink.getId(), null, 2, drink.getPrix(), null, false
        );
        mockMvc.perform(post("/api/commandes/" + orderId + "/items")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(barItemReq)))
                .andExpect(status().isOk());

        // 5. Add Kitchen food item
        CommandeItemRequestDTO foodItemReq = new CommandeItemRequestDTO(
                food.getId(), null, 1, food.getPrix(), null, false
        );
        MvcResult addFoodResult = mockMvc.perform(post("/api/commandes/" + orderId + "/items")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(foodItemReq)))
                .andExpect(status().isOk())
                .andReturn();

        CommandeResponseDTO updatedOrderDto = objectMapper.readValue(
                addFoodResult.getResponse().getContentAsString(),
                CommandeResponseDTO.class
        );
        assertThat(updatedOrderDto.items()).hasSize(2);

        var barItemDto = updatedOrderDto.items().stream()
                .filter(i -> i.station() == PreparationStation.BAR)
                .findFirst()
                .orElseThrow();
        var kitchenItemDto = updatedOrderDto.items().stream()
                .filter(i -> i.station() == PreparationStation.KITCHEN)
                .findFirst()
                .orElseThrow();

        assertThat(barItemDto.statut()).isEqualTo(CommandeStatut.EN_ATTENTE);
        assertThat(kitchenItemDto.statut()).isEqualTo(CommandeStatut.EN_ATTENTE);

        // 6. Retrieve orders by station /api/commandes/station/KITCHEN
        mockMvc.perform(get("/api/commandes/station/KITCHEN")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + orderId + ")]").exists());

        // 7. Advance Kitchen item to EN_PREPARATION
        mockMvc.perform(patch("/api/commandes/" + orderId + "/items/" + kitchenItemDto.id() + "/statut")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("statut", "EN_PREPARATION"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("EN_PREPARATION"));

        // Verify order status synchronized to EN_PREPARATION
        mockMvc.perform(get("/api/commandes/" + orderId)
                        .header(HttpHeaders.AUTHORIZATION, adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("EN_PREPARATION"));

        // 8. Mark Kitchen item as PRET
        mockMvc.perform(patch("/api/commandes/" + orderId + "/items/" + kitchenItemDto.id() + "/statut")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("statut", "PRET"))))
                .andExpect(status().isOk());

        // Order remains EN_PREPARATION because bar item is still not PRET
        mockMvc.perform(get("/api/commandes/" + orderId)
                        .header(HttpHeaders.AUTHORIZATION, adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("EN_PREPARATION"));

        // 9. Mark Bar item as PRET -> Now ALL items are PRET
        mockMvc.perform(patch("/api/commandes/" + orderId + "/items/" + barItemDto.id() + "/statut")
                        .header(HttpHeaders.AUTHORIZATION, adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("statut", "PRET"))))
                .andExpect(status().isOk());

        // Order is now automatically synchronized to PRET!
        mockMvc.perform(get("/api/commandes/" + orderId)
                        .header(HttpHeaders.AUTHORIZATION, adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("PRET"));
    }
}
