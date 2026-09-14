package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.HappyHourRuleRequestDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.DiscountType;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.HappyHourRuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Collections;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end integration tests for Happy Hour promotional rule engine,
 * verifying REST endpoints, authorization constraints, and dynamic pricing simulation.
 */
class HappyHourIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private HappyHourRuleRepository happyHourRuleRepository;

    @Autowired
    private CocktailRepository cocktailRepository;

    private Cocktail testCocktail;

    @BeforeEach
    void setUpData() {
        happyHourRuleRepository.deleteAll();

        testCocktail = new Cocktail();
        testCocktail.setNom("Integration Mojito");
        testCocktail.setPrix(new BigDecimal("12.00"));
        testCocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        testCocktail.setDisponible(true);
        testCocktail = cocktailRepository.save(testCocktail);
    }

    @Test
    @DisplayName("Complete Happy Hour lifecycle: Create -> List -> Preview -> Toggle -> Delete")
    void completeHappyHourFlow_success() throws Exception {
        String managerToken = getManagerToken();

        // 1. Create a Happy Hour rule (Manager)
        HappyHourRuleRequestDTO createReq = new HappyHourRuleRequestDTO(
                "Friday Cocktail Rush",
                LocalTime.of(17, 0),
                LocalTime.of(20, 0),
                Set.of(DayOfWeek.FRIDAY),
                DiscountType.PERCENTAGE,
                new BigDecimal("25.00"),
                true,
                Set.of(CocktailCategorie.ALCOOLISE),
                Collections.emptySet()
        );

        String responseJson = mockMvc.perform(post("/api/happy-hour")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("Friday Cocktail Rush"))
                .andExpect(jsonPath("$.discountType").value("PERCENTAGE"))
                .andExpect(jsonPath("$.discountValue").value(25.00))
                .andExpect(jsonPath("$.active").value(true))
                .andReturn().getResponse().getContentAsString();

        Number ruleIdNum = objectMapper.readTree(responseJson).get("id").numberValue();
        Long ruleId = ruleIdNum.longValue();

        // 2. List rules as Serveur and anonymously (public QR client menu)
        String serveurToken = getServeurToken();
        mockMvc.perform(get("/api/happy-hour")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[?(@.id == " + ruleId + ")].name").value("Friday Cocktail Rush"));

        // Verify anonymous patrons can also read happy hour rules
        mockMvc.perform(get("/api/happy-hour"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));

        // 3. Simulate pricing preview inside promotional window
        // Friday 2026-09-04 at 18:30 -> in window, 12.00 EUR - 25% = 9.00 EUR
        mockMvc.perform(get("/api/happy-hour/pricing-preview")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken)
                        .param("cocktailId", testCocktail.getId().toString())
                        .param("timestamp", "2026-09-04T18:30:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isHappyHour").value(true))
                .andExpect(jsonPath("$.basePrice").value(12.00))
                .andExpect(jsonPath("$.effectivePrice").value(9.00))
                .andExpect(jsonPath("$.discountAmount").value(3.00))
                .andExpect(jsonPath("$.appliedRuleName").value("Friday Cocktail Rush"));

        // 4. Simulate pricing outside window (Saturday 2026-09-05 at 18:30)
        mockMvc.perform(get("/api/happy-hour/pricing-preview")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken)
                        .param("cocktailId", testCocktail.getId().toString())
                        .param("timestamp", "2026-09-05T18:30:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isHappyHour").value(false))
                .andExpect(jsonPath("$.effectivePrice").value(12.00))
                .andExpect(jsonPath("$.discountAmount").value(0.00));

        // 5. Toggle active status as Manager
        mockMvc.perform(patch("/api/happy-hour/" + ruleId + "/toggle")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        // 6. Delete rule as Manager
        mockMvc.perform(delete("/api/happy-hour/" + ruleId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken))
                .andExpect(status().isNoContent());

        // 7. Verify deletion
        mockMvc.perform(get("/api/happy-hour/" + ruleId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Unauthorized creation: anonymous and non-manager users cannot create Happy Hour rules")
    void securityConstraints_createRequiresManagerOrAdmin() throws Exception {
        HappyHourRuleRequestDTO req = new HappyHourRuleRequestDTO(
                "Unauthorized Rule",
                LocalTime.of(18, 0),
                LocalTime.of(20, 0),
                Set.of(DayOfWeek.FRIDAY),
                DiscountType.PERCENTAGE,
                new BigDecimal("20.00"),
                true,
                Collections.emptySet(),
                Collections.emptySet()
        );

        // Anonymous request
        mockMvc.perform(post("/api/happy-hour")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());

        // Server user without Manager role
        String serveurToken = getServeurToken();
        mockMvc.perform(post("/api/happy-hour")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + serveurToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }
}
