package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.BatchTransitionRequestDTO;
import com.bar.gestioncocktail.dto.CommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.CommandeRequestDTO;
import com.bar.gestioncocktail.dto.CommandeResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.CocktailIngredientRepository;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
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
 * Integration tests verifying the Rush / Batching preparation workflow across multiple tables.
 */
class CommandeBatchIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private CocktailRepository cocktailRepository;

    @Autowired
    private IngredientRepository ingredientRepository;

    @Autowired
    private CocktailIngredientRepository cocktailIngredientRepository;

    @Test
    @DisplayName("batchTransition_transitionsMultipleTablesAndDeductsStock")
    void batchTransition_transitionsMultipleTablesAndDeductsStock() throws Exception {
        TableEntity table1 = new TableEntity();
        table1.setNumero(991);
        table1.setZone("Bar");
        table1.setCapacite(2);
        table1 = tableRepository.save(table1);

        TableEntity table2 = new TableEntity();
        table2.setNumero(992);
        table2.setZone("Bar");
        table2.setCapacite(4);
        table2 = tableRepository.save(table2);

        Ingredient ingredient = new Ingredient();
        ingredient.setNom("Menthe Batch Test " + System.currentTimeMillis());
        ingredient.setQuantiteStock(new BigDecimal("100.00"));
        ingredient.setSeuilAlerte(new BigDecimal("10.00"));
        ingredient.setUniteMesure("feuilles");
        ingredient = ingredientRepository.save(ingredient);

        Cocktail cocktail = new Cocktail();
        cocktail.setNom("Mojito Batch Test " + System.currentTimeMillis());
        cocktail.setPrix(new BigDecimal("9.00"));
        cocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        cocktail = cocktailRepository.save(cocktail);

        CocktailIngredient ci = new CocktailIngredient();
        ci.setCocktail(cocktail);
        ci.setIngredient(ingredient);
        ci.setQuantite(new BigDecimal("6.00"));
        cocktailIngredientRepository.save(ci);

        // 1. Create order for Table 1
        CommandeRequestDTO order1Req = new CommandeRequestDTO(table1.getId(), null, "Order 1 batch", BigDecimal.ZERO);
        MvcResult res1 = mockMvc.perform(post("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(order1Req)))
                .andExpect(status().isOk())
                .andReturn();
        CommandeResponseDTO order1 = objectMapper.readValue(res1.getResponse().getContentAsString(), CommandeResponseDTO.class);

        CommandeItemRequestDTO item1Req = new CommandeItemRequestDTO(cocktail.getId(), null, 2, new BigDecimal("9.00"), null, false);
        MvcResult itemRes1 = mockMvc.perform(post("/api/commandes/" + order1.id() + "/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(item1Req)))
                .andExpect(status().isOk())
                .andReturn();
        CommandeResponseDTO order1WithItems = objectMapper.readValue(itemRes1.getResponse().getContentAsString(), CommandeResponseDTO.class);
        Long item1Id = order1WithItems.items().get(0).id();

        // 2. Create order for Table 2
        CommandeRequestDTO order2Req = new CommandeRequestDTO(table2.getId(), null, "Order 2 batch", BigDecimal.ZERO);
        MvcResult res2 = mockMvc.perform(post("/api/commandes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(order2Req)))
                .andExpect(status().isOk())
                .andReturn();
        CommandeResponseDTO order2 = objectMapper.readValue(res2.getResponse().getContentAsString(), CommandeResponseDTO.class);

        CommandeItemRequestDTO item2Req = new CommandeItemRequestDTO(cocktail.getId(), null, 3, new BigDecimal("9.00"), null, false);
        MvcResult itemRes2 = mockMvc.perform(post("/api/commandes/" + order2.id() + "/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(item2Req)))
                .andExpect(status().isOk())
                .andReturn();
        CommandeResponseDTO order2WithItems = objectMapper.readValue(itemRes2.getResponse().getContentAsString(), CommandeResponseDTO.class);
        Long item2Id = order2WithItems.items().get(0).id();

        // 3. Advance batch to EN_PREPARATION
        BatchTransitionRequestDTO batchStart = new BatchTransitionRequestDTO(
                List.of(item1Id, item2Id), null, CommandeStatut.EN_PREPARATION
        );

        mockMvc.perform(post("/api/commandes/batch/transition")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getBarmanToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batchStart)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));

        // Verify stock deduction: (2 + 3) * 6 = 30 leaves 70 remaining
        Ingredient updatedIngredient = ingredientRepository.findById(ingredient.getId()).orElseThrow();
        assertThat(updatedIngredient.getQuantiteStock()).isEqualByComparingTo("70.00");

        // 4. Complete batch to PRET
        BatchTransitionRequestDTO batchComplete = new BatchTransitionRequestDTO(
                List.of(item1Id, item2Id), null, CommandeStatut.PRET
        );

        mockMvc.perform(post("/api/commandes/batch/transition")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getBarmanToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batchComplete)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));
    }
}
