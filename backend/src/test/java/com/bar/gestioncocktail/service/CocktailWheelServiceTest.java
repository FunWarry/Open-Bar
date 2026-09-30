package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CocktailLibraryItemDTO;
import com.bar.gestioncocktail.dto.CocktailLibraryItemDTO.CocktailLibraryIngredientDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CocktailWheelService}.
 */
@ExtendWith(MockitoExtension.class)
class CocktailWheelServiceTest {

    @Mock
    private CocktailRepository cocktailRepository;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private CocktailWheelService cocktailWheelService;

    private static final String TEST_WHEEL_FILE = "data/establishment_connection_wheel.json";

    @BeforeEach
    void setUp() {
        new java.io.File(TEST_WHEEL_FILE).delete();
        cocktailWheelService = new CocktailWheelService(
                cocktailRepository,
                objectMapper,
                establishmentConfigService
        );
    }

    @AfterEach
    void tearDown() {
        new java.io.File(TEST_WHEEL_FILE).delete();
    }

    @Test
    @DisplayName("getWheelData for LIBRARY scope should check module capability and return wheel data")
    void getWheelData_libraryScope_success() {
        JsonNode result = cocktailWheelService.getWheelData(CocktailWheelScope.LIBRARY);

        assertThat(result).isNotNull();
        assertThat(result.has("categories")).isTrue();
        verify(establishmentConfigService, times(1)).checkModuleEnabled(EstablishmentModule.COCKTAIL_LIBRARY);
    }

    @Test
    @DisplayName("getWheelData for LIBRARY scope should throw exception when module is disabled")
    void getWheelData_libraryScope_disabledModule_throws() {
        doThrow(new BusinessException("Cocktail library module disabled"))
                .when(establishmentConfigService).checkModuleEnabled(EstablishmentModule.COCKTAIL_LIBRARY);

        assertThatThrownBy(() -> cocktailWheelService.getWheelData(CocktailWheelScope.LIBRARY))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Cocktail library module disabled");
    }

    @Test
    @DisplayName("generateLibraryWheel should compute node frequency and co-occurrence edges")
    void generateLibraryWheel_computesNodesAndEdges() {
        CocktailLibraryIngredientDTO ingRum = new CocktailLibraryIngredientDTO("White Rum", BigDecimal.valueOf(5), "cl", "light_liquor", BigDecimal.valueOf(40), BigDecimal.ONE, Collections.emptyList(), true);
        CocktailLibraryIngredientDTO ingLime = new CocktailLibraryIngredientDTO("Lime Juice", BigDecimal.valueOf(3), "cl", "nonalcoholic", BigDecimal.ZERO, BigDecimal.valueOf(0.5), Collections.emptyList(), true);
        CocktailLibraryIngredientDTO ingMint = new CocktailLibraryIngredientDTO("Mint", BigDecimal.valueOf(6), "leaves", "spices", BigDecimal.ZERO, BigDecimal.valueOf(0.2), Collections.emptyList(), true);

        CocktailLibraryItemDTO mojito = new CocktailLibraryItemDTO(
                "lib_1", "Mojito", "Desc", "ALCOOLISE", "CLASSIC", "RUM", true,
                BigDecimal.TEN, BigDecimal.valueOf(12), false, true, true,
                "Tumbler", null, null, List.of("SOUR", "SWEET"), Collections.emptyList(), 60,
                Collections.emptyList(), List.of(ingRum, ingLime, ingMint), Collections.emptyList(),
                "Shake", 90, true, "Mojito", null
        );

        CocktailLibraryItemDTO daiquiri = new CocktailLibraryItemDTO(
                "lib_2", "Daiquiri", "Desc", "ALCOOLISE", "CLASSIC", "RUM", true,
                BigDecimal.TEN, BigDecimal.valueOf(15), false, true, true,
                "Coupe", null, null, List.of("SOUR"), Collections.emptyList(), 60,
                Collections.emptyList(), List.of(ingRum, ingLime), Collections.emptyList(),
                "Shake", 85, true, "Sour", null
        );

        JsonNode wheel = cocktailWheelService.generateLibraryWheel(List.of(mojito, daiquiri));

        assertThat(wheel).isNotNull();
        JsonNode nodes = wheel.get("nodes");
        JsonNode edges = wheel.get("edges");

        assertThat(nodes).isNotNull();
        assertThat(nodes.size()).isEqualTo(3);

        // Rum and Lime should both have count 2, Mint should have count 1
        boolean foundRum = false;
        for (JsonNode n : nodes) {
            if ("white rum".equals(n.get("id").asText())) {
                foundRum = true;
                assertThat(n.get("count").asInt()).isEqualTo(2);
                assertThat(n.get("group").asText()).isEqualTo("light_liquor");
            }
        }
        assertThat(foundRum).isTrue();

        // Edge between White Rum and Lime Juice should have count 2
        assertThat(edges).isNotNull();
        boolean foundRumLimeEdge = false;
        for (JsonNode e : edges) {
            String a = e.get("a").asText();
            String b = e.get("b").asText();
            if ((a.equals("lime juice") && b.equals("white rum")) || (a.equals("white rum") && b.equals("lime juice"))) {
                foundRumLimeEdge = true;
                assertThat(e.get("count").asInt()).isEqualTo(2);
            }
        }
        assertThat(foundRumLimeEdge).isTrue();
    }

    @Test
    @DisplayName("getWheelData for ESTABLISHMENT scope should regenerate from repository when cache is empty")
    void getWheelData_establishmentScope_generatesFromRepository() {
        Cocktail cocktail1 = new Cocktail();
        cocktail1.setId(1L);
        cocktail1.setNom("Gin Tonic");

        Ingredient gin = new Ingredient();
        gin.setId(10L);
        gin.setNom("London Dry Gin");
        gin.setCategory("light_liquor");

        Ingredient tonic = new Ingredient();
        tonic.setId(11L);
        tonic.setNom("Tonic Water");
        tonic.setCategory("nonalcoholic");

        CocktailIngredient ci1 = new CocktailIngredient();
        ci1.setCocktail(cocktail1);
        ci1.setIngredient(gin);

        CocktailIngredient ci2 = new CocktailIngredient();
        ci2.setCocktail(cocktail1);
        ci2.setIngredient(tonic);

        cocktail1.setIngredients(new ArrayList<>(List.of(ci1, ci2)));

        when(cocktailRepository.findAllWithIngredients()).thenReturn(List.of(cocktail1));

        JsonNode wheel = cocktailWheelService.getWheelData(CocktailWheelScope.ESTABLISHMENT);

        assertThat(wheel).isNotNull();
        JsonNode nodes = wheel.get("nodes");
        JsonNode edges = wheel.get("edges");

        assertThat(nodes.size()).isEqualTo(2);
        assertThat(edges.size()).isEqualTo(1);
        assertThat(edges.get(0).get("count").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("regenerateEstablishmentWheel with empty repository returns empty nodes and edges")
    void regenerateEstablishmentWheel_emptyRepository_returnsCleanEmptyGraph() {
        when(cocktailRepository.findAllWithIngredients()).thenReturn(Collections.emptyList());

        JsonNode wheel = cocktailWheelService.regenerateEstablishmentWheel();

        assertThat(wheel).isNotNull();
        assertThat(wheel.get("nodes").size()).isZero();
        assertThat(wheel.get("edges").size()).isZero();
        assertThat(wheel.get("categories").size()).isGreaterThan(0);
    }
}
