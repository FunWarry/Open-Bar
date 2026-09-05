package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.PublicCommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.PublicCommandeRequestDTO;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for ephemeral table sessions and anti-fraud QR code validation.
 * <p>
 * Validates session lifecycle (creation on occupancy, invalidation on liberation),
 * rejection of forged/expired tokens (403 Forbidden), and authorization of valid sessions.
 */
class TableSessionIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private TableSessionRepository tableSessionRepository;

    @Autowired
    private AppSettingsRepository appSettingsRepository;

    @Autowired
    private CocktailRepository cocktailRepository;

    @Autowired
    private IngredientRepository ingredientRepository;

    private Long tableId;
    private Long cocktailId;
    private String serveurToken;

    @BeforeEach
    void setUpData() {
        serveurToken = getServeurToken();

        tableSessionRepository.deleteAll();

        // Create or get test cocktail with stock
        Ingredient rum = new Ingredient();
        rum.setNom("Rhum Test " + System.currentTimeMillis());
        rum.setQuantiteStock(BigDecimal.valueOf(500.0));
        rum.setSeuilAlerte(BigDecimal.valueOf(50.0));
        rum.setUniteMesure("CL");
        rum = ingredientRepository.save(rum);

        Cocktail mojito = new Cocktail();
        mojito.setNom("Mojito Session " + System.currentTimeMillis());
        mojito.setPrix(BigDecimal.valueOf(9.00));
        mojito.setCategorie(CocktailCategorie.ALCOOLISE);
        mojito.setDisponible(true);

        CocktailIngredient ci = new CocktailIngredient();
        ci.setCocktail(mojito);
        ci.setIngredient(rum);
        ci.setQuantite(BigDecimal.valueOf(5.0));
        mojito.setIngredients(List.of(ci));

        mojito = cocktailRepository.save(mojito);
        this.cocktailId = mojito.getId();

        // Create test table
        TableEntity table = new TableEntity();
        table.setNumero(77);
        table.setZone("Interieur");
        table.setCapacite(4);
        table.setOccupee(false);
        table = tableRepository.save(table);
        this.tableId = table.getId();

        // Configure AppSettings
        AppSettings settings = appSettingsRepository.findById(AppSettings.SINGLETON_ID).orElseGet(() -> {
            AppSettings s = new AppSettings();
            s.setId(AppSettings.SINGLETON_ID);
            return s;
        });
        settings.setTableSessionValidationEnabled(true);
        appSettingsRepository.saveAndFlush(settings);
    }

    @Test
    @DisplayName("tableOccupancy_triggersSessionCreation_andAllowsOrderWithValidToken")
    void tableOccupancy_and_orderPlacement_withSessionToken_success() throws Exception {
        // 1. Staff occupies table -> triggers TableSession creation
        mockMvc.perform(post("/api/tables/" + tableId + "/occuper")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.occupee").value(true));

        TableSession activeSession = tableSessionRepository
                .findFirstByTableIdAndStatusOrderByOpenedAtDesc(tableId, TableSessionStatus.ACTIVE)
                .orElseThrow();
        String sessionToken = activeSession.getSessionToken();
        assertThat(sessionToken).isNotBlank();

        // 2. Patron validates session via public endpoint
        mockMvc.perform(get("/api/public/tables/" + tableId + "/session")
                        .param("token", sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.sessionToken").value(sessionToken));

        // 3. Patron places public order with the valid session token -> 201 Created
        PublicCommandeItemRequestDTO item = new PublicCommandeItemRequestDTO(cocktailId, null, 2, "Fresh mint");
        PublicCommandeRequestDTO orderRequest = new PublicCommandeRequestDTO(tableId, List.of(item), "QR Table Order", sessionToken);

        mockMvc.perform(post("/api/public/commandes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.commandeId").isNotEmpty())
                .andExpect(jsonPath("$.trackingToken").isNotEmpty());
    }

    @Test
    @DisplayName("orderPlacement_withInvalidOrExpiredToken_returns403Forbidden")
    void orderPlacement_withInvalidOrMissingToken_returns403Forbidden() throws Exception {
        // Order with fake token
        PublicCommandeItemRequestDTO item = new PublicCommandeItemRequestDTO(cocktailId, null, 1, null);
        PublicCommandeRequestDTO forgedRequest = new PublicCommandeRequestDTO(tableId, List.of(item), "Fraud Attempt", "forged-token-12345");

        mockMvc.perform(post("/api/public/commandes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(forgedRequest)))
                .andExpect(status().isForbidden());

        // Order without any token
        PublicCommandeRequestDTO missingTokenRequest = new PublicCommandeRequestDTO(tableId, List.of(item), "No Token", null);

        mockMvc.perform(post("/api/public/commandes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(missingTokenRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("tableLiberation_invalidatesSession_andRejectsSubsequentOrders")
    void tableLiberation_invalidatesSession() throws Exception {
        // 1. Occupy table and get token
        mockMvc.perform(post("/api/tables/" + tableId + "/occuper")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken))
                .andExpect(status().isOk());

        TableSession activeSession = tableSessionRepository
                .findFirstByTableIdAndStatusOrderByOpenedAtDesc(tableId, TableSessionStatus.ACTIVE)
                .orElseThrow();
        String sessionToken = activeSession.getSessionToken();

        // 2. Liberate table -> invalidates active session (transitions to CLOSED)
        mockMvc.perform(post("/api/tables/" + tableId + "/liberer")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken))
                .andExpect(status().isOk());

        TableSession closedSession = tableSessionRepository.findBySessionToken(sessionToken).orElseThrow();
        assertThat(closedSession.getStatus()).isEqualTo(TableSessionStatus.CLOSED);

        // 3. Attempting to place an order with the now-closed token is rejected with 403 Forbidden
        PublicCommandeItemRequestDTO item = new PublicCommandeItemRequestDTO(cocktailId, null, 1, null);
        PublicCommandeRequestDTO request = new PublicCommandeRequestDTO(tableId, List.of(item), "Stale order", sessionToken);

        mockMvc.perform(post("/api/public/commandes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("refreshSession_publicEndpoint_generatesFreshActiveSession")
    void refreshSession_publicEndpoint_success() throws Exception {
        mockMvc.perform(post("/api/public/tables/" + tableId + "/session/refresh"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.sessionToken").isNotEmpty());
    }
}
