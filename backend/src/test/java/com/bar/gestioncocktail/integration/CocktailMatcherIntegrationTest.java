package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.FlavorProfile;
import com.bar.gestioncocktail.repository.CocktailRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for cocktail flavor profile facets and customer matcher endpoint.
 * Validates aggregate calculations and multi-facet filtering over real database tables.
 */
class CocktailMatcherIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private CocktailRepository cocktailRepository;

    private Cocktail fruityCocktail;
    private Cocktail smokyCocktail;
    private Cocktail mocktailDrink;

    @BeforeEach
    void setUpTestData() {
        cocktailRepository.deleteAll();

        fruityCocktail = new Cocktail();
        fruityCocktail.setNom("Tropical Paradise");
        fruityCocktail.setDescription("A sweet fruity rum cocktail");
        fruityCocktail.setPrix(new BigDecimal("9.50"));
        fruityCocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        fruityCocktail.setDisponible(true);
        fruityCocktail.setFlavorProfiles(Set.of(FlavorProfile.FRUITY, FlavorProfile.SWEET));
        fruityCocktail.setAlcoholLevel(new BigDecimal("12.5"));
        fruityCocktail.setMocktail(false);
        fruityCocktail.setVegan(true);
        fruityCocktail.setGlutenFree(true);
        fruityCocktail = cocktailRepository.save(fruityCocktail);

        smokyCocktail = new Cocktail();
        smokyCocktail.setNom("Smoky Mezcalita");
        smokyCocktail.setDescription("Bold smoky and spicy mezcal cocktail");
        smokyCocktail.setPrix(new BigDecimal("12.00"));
        smokyCocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        smokyCocktail.setDisponible(true);
        smokyCocktail.setFlavorProfiles(Set.of(FlavorProfile.SMOKY, FlavorProfile.SPICY));
        smokyCocktail.setAlcoholLevel(new BigDecimal("22.0"));
        smokyCocktail.setMocktail(false);
        smokyCocktail.setVegan(true);
        smokyCocktail.setGlutenFree(false);
        smokyCocktail = cocktailRepository.save(smokyCocktail);

        mocktailDrink = new Cocktail();
        mocktailDrink.setNom("Virgin Fruity Mojito");
        mocktailDrink.setDescription("Refreshing non-alcoholic herbal and fruity cooler");
        mocktailDrink.setPrix(new BigDecimal("6.00"));
        mocktailDrink.setCategorie(CocktailCategorie.SANS_ALCOOL);
        mocktailDrink.setDisponible(true);
        mocktailDrink.setFlavorProfiles(Set.of(FlavorProfile.FRUITY, FlavorProfile.HERBAL));
        mocktailDrink.setAlcoholLevel(BigDecimal.ZERO);
        mocktailDrink.setMocktail(true);
        mocktailDrink.setVegan(true);
        mocktailDrink.setGlutenFree(true);
        mocktailDrink = cocktailRepository.save(mocktailDrink);
    }

    @Test
    @DisplayName("GET /api/cocktails/facets - returns accurate aggregate metrics without authentication")
    void shouldReturnCatalogFacets() throws Exception {
        mockMvc.perform(get("/api/cocktails/facets")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAvailable", is(3)))
                .andExpect(jsonPath("$.flavorCounts.FRUITY", is(2)))
                .andExpect(jsonPath("$.flavorCounts.SMOKY", is(1)))
                .andExpect(jsonPath("$.flavorCounts.HERBAL", is(1)))
                .andExpect(jsonPath("$.flavorCounts.SPICY", is(1)))
                .andExpect(jsonPath("$.mocktailsCount", is(1)))
                .andExpect(jsonPath("$.veganCount", is(3)))
                .andExpect(jsonPath("$.glutenFreeCount", is(2)));
    }

    @Test
    @DisplayName("GET /api/cocktails/matcher - filters cocktails by flavor and dietary facets")
    void shouldFilterAndMatchCocktails() throws Exception {
        // 1. Filter by flavor FRUITY
        mockMvc.perform(get("/api/cocktails/matcher")
                .param("flavors", "FRUITY")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].nom", containsInAnyOrder("Tropical Paradise", "Virgin Fruity Mojito")));

        // 2. Filter by Mocktail only
        mockMvc.perform(get("/api/cocktails/matcher")
                .param("mocktail", "true")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].nom", is("Virgin Fruity Mojito")));

        // 3. Filter by Max ABV <= 15.0% and Gluten Free = true
        mockMvc.perform(get("/api/cocktails/matcher")
                .param("maxAbv", "15.0")
                .param("glutenFree", "true")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].nom", containsInAnyOrder("Tropical Paradise", "Virgin Fruity Mojito")));

        // 4. Filter by SMOKY flavor
        mockMvc.perform(get("/api/cocktails/matcher")
                .param("flavors", "SMOKY")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].nom", is("Smoky Mezcalita")));
    }
}
