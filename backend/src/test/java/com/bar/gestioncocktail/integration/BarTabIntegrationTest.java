package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.BarTabRepository;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.EstablishmentConfigRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for customer bar tab lifecycle,
 * order attachment without table, addition breakdown, and consolidated settlement.
 */
class BarTabIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private BarTabRepository barTabRepository;

    @Autowired
    private CocktailRepository cocktailRepository;

    @Autowired
    private EstablishmentConfigRepository establishmentConfigRepository;

    @Test
    @DisplayName("fullBarTabLifecycle_createOrderAndSettle_success")
    void fullBarTabLifecycle_createOrderAndSettle_success() throws Exception {
        // Ensure BAR_TABS module is enabled in config
        EstablishmentConfig config = establishmentConfigRepository.findById(EstablishmentConfig.SINGLETON_ID).orElseGet(() -> {
            EstablishmentConfig c = new EstablishmentConfig();
            c.setLegalName("OpenBar Test");
            return c;
        });
        config.setModuleBarTabsEnabled(true);
        establishmentConfigRepository.save(config);

        Cocktail cocktail = new Cocktail();
        cocktail.setNom("Gin Tonic Tab Test");
        cocktail.setPrix(new BigDecimal("9.00"));
        cocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        cocktail = cocktailRepository.save(cocktail);

        String serveurToken = getServeurToken();

        // 1. Create a new bar tab
        BarTabCreateRequest createReq = new BarTabCreateRequest(
                "VIP Client Test",
                "CB-PREAUTH-1234",
                "Client au comptoir",
                new BigDecimal("50.00"),
                null
        );

        MvcResult createResult = mockMvc.perform(post("/api/bar-tabs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.nom").value("VIP Client Test"))
                .andExpect(jsonPath("$.statut").value("ACTIVE"))
                .andReturn();

        BarTabResponseDTO createdTab = objectMapper.readValue(
                createResult.getResponse().getContentAsString(),
                BarTabResponseDTO.class
        );
        Long tabId = createdTab.id();

        // 2. Fetch active tabs
        mockMvc.perform(get("/api/bar-tabs?statut=ACTIVE")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + tabId + ")]").exists());

        // 3. Create an order attached to this tab (without a physical table)
        CommandeItemRequestDTO itemReq = new CommandeItemRequestDTO(
                cocktail.getId(),
                null,
                2,
                cocktail.getPrix(),
                "Extra citron",
                false
        );
        CommandeRequestDTO orderReq = new CommandeRequestDTO(
                null,
                tabId,
                null,
                "Commande bar tab",
                BigDecimal.ZERO,
                null,
                List.of(itemReq)
        );

        MvcResult orderResult = mockMvc.perform(post("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.barTabId").value(tabId))
                .andReturn();

        CommandeResponseDTO createdOrder = objectMapper.readValue(
                orderResult.getResponse().getContentAsString(),
                CommandeResponseDTO.class
        );
        assertThat(createdOrder.tableId()).isNull();
        assertThat(createdOrder.barTabId()).isEqualTo(tabId);

        // 4. Get Tab addition breakdown
        mockMvc.perform(get("/api/bar-tabs/" + tabId + "/addition")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tabId").value(tabId))
                .andExpect(jsonPath("$.totalTTC").value(18.00))
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items[0].cocktailNom").value("Gin Tonic Tab Test"));

        // 5. Settle the tab
        EncaissementRequestDTO settleReq = new EncaissementRequestDTO(
                "CARTE",
                BigDecimal.ZERO,
                null,
                null,
                null,
                "Regle au bar",
                true,
                List.of(createdOrder.id())
        );

        mockMvc.perform(post("/api/bar-tabs/" + tabId + "/encaisser")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(settleReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.numero").exists())
                .andExpect(jsonPath("$.barTabId").value(tabId));

        // 6. Verify tab status in database is now SETTLED
        BarTab tabInDb = barTabRepository.findById(tabId).orElseThrow();
        assertThat(tabInDb.getStatut()).isEqualTo(BarTabStatus.SETTLED);
        assertThat(tabInDb.getSettledAt()).isNotNull();
    }
}
