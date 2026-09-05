package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.TableCartItemRequestDTO;
import com.bar.gestioncocktail.dto.TableCartItemUpdateRequestDTO;
import com.bar.gestioncocktail.dto.TableCartSubmitRequestDTO;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for multi-guest collaborative table carts.
 * <p>
 * Tests multi-guest item additions, real-time shared cart view, quantity updates,
 * consolidated order submission to the bar, and cart purging upon table liberation.
 */
class TableCartIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private TableCartItemRepository tableCartItemRepository;

    @Autowired
    private CocktailRepository cocktailRepository;

    @Autowired
    private IngredientRepository ingredientRepository;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    private Long tableId;
    private Long cocktailId;

    @BeforeEach
    void setUpData() {
        tableCartItemRepository.deleteAll();

        Ingredient rum = new Ingredient();
        rum.setNom("Rhum Cart Test " + System.currentTimeMillis());
        rum.setQuantiteStock(BigDecimal.valueOf(1000.0));
        rum.setSeuilAlerte(BigDecimal.valueOf(50.0));
        rum.setUniteMesure("CL");
        rum = ingredientRepository.save(rum);

        Cocktail mojito = new Cocktail();
        mojito.setNom("Cart Mojito " + System.currentTimeMillis());
        mojito.setPrix(BigDecimal.valueOf(10.00));
        mojito.setCategorie(CocktailCategorie.ALCOOLISE);
        mojito.setDisponible(true);

        CocktailIngredient ci = new CocktailIngredient();
        ci.setCocktail(mojito);
        ci.setIngredient(rum);
        ci.setQuantite(BigDecimal.valueOf(5.0));
        mojito.setIngredients(List.of(ci));

        mojito = cocktailRepository.save(mojito);
        this.cocktailId = mojito.getId();

        TableEntity table = new TableEntity();
        table.setNumero(88);
        table.setZone("Terrasse");
        table.setCapacite(4);
        table.setOccupee(true);
        table = tableRepository.save(table);
        this.tableId = table.getId();
    }

    @Test
    @DisplayName("collaborativeCartLifecycle: multi-guest additions, updates, consolidated submission")
    void collaborativeCartLifecycle_multiGuest_success() throws Exception {
        // 1. Guest 1 (Alex) adds 2x Mojito
        TableCartItemRequestDTO alexItem = new TableCartItemRequestDTO();
        alexItem.setGuestSessionId("guest-alex");
        alexItem.setGuestName("Alex");
        alexItem.setCocktailId(cocktailId);
        alexItem.setQuantite(2);
        alexItem.setNotes("Less ice");

        mockMvc.perform(post("/api/public/tables/" + tableId + "/cart/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(alexItem)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.totalPrice").value(20.00))
                .andExpect(jsonPath("$.items[0].guestName").value("Alex"));

        // 2. Guest 2 (Sam) adds 1x Mojito
        TableCartItemRequestDTO samItem = new TableCartItemRequestDTO();
        samItem.setGuestSessionId("guest-sam");
        samItem.setGuestName("Sam");
        samItem.setCocktailId(cocktailId);
        samItem.setQuantite(1);
        samItem.setNotes("Extra mint");

        mockMvc.perform(post("/api/public/tables/" + tableId + "/cart/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(samItem)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.totalPrice").value(30.00))
                .andExpect(jsonPath("$.items.length()").value(2));

        // 3. Retrieve consolidated cart via GET
        mockMvc.perform(get("/api/public/tables/" + tableId + "/cart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tableId").value(tableId))
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.totalPrice").value(30.00));

        // 4. Update Alex's item quantity to 1
        List<TableCartItem> items = tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(tableId);
        assertThat(items).hasSize(2);
        Long alexItemId = items.getFirst().getId();

        TableCartItemUpdateRequestDTO updateRequest = new TableCartItemUpdateRequestDTO();
        updateRequest.setGuestSessionId("guest-alex");
        updateRequest.setQuantite(1);
        updateRequest.setNotes("Regular ice");

        mockMvc.perform(put("/api/public/tables/" + tableId + "/cart/items/" + alexItemId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.totalPrice").value(20.00));

        // 5. Submit consolidated cart
        TableCartSubmitRequestDTO submitRequest = new TableCartSubmitRequestDTO();
        submitRequest.setGuestSessionId("guest-alex");
        submitRequest.setGuestName("Alex");
        submitRequest.setNotes("Combined order for Table 88");

        mockMvc.perform(post("/api/public/tables/" + tableId + "/cart/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.commandeId").isNotEmpty())
                .andExpect(jsonPath("$.trackingToken").isNotEmpty());

        // 6. Verify cart in DB is now cleared
        List<TableCartItem> remaining = tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(tableId);
        assertThat(remaining).isEmpty();

        // 7. GET cart returns empty
        mockMvc.perform(get("/api/public/tables/" + tableId + "/cart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    @DisplayName("tableLiberation: automatically clears pending collaborative cart items")
    void tableLiberation_clearsCollaborativeCart() throws Exception {
        TableCartItemRequestDTO item = new TableCartItemRequestDTO();
        item.setGuestSessionId("guest-1");
        item.setGuestName("Alex");
        item.setCocktailId(cocktailId);
        item.setQuantite(1);

        mockMvc.perform(post("/api/public/tables/" + tableId + "/cart/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(item)))
                .andExpect(status().isCreated());

        assertThat(tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(tableId)).hasSize(1);

        TableEntity table = tableRepository.findById(tableId).orElseThrow();
        eventPublisher.publishEvent(new TableLiberatedEvent(table));

        assertThat(tableCartItemRepository.findByTableIdOrderByCreatedAtAsc(tableId)).isEmpty();
    }
}
