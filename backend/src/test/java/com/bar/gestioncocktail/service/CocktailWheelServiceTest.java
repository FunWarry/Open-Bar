package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CocktailLibraryItemDTO;
import com.bar.gestioncocktail.dto.CocktailLibraryItemDTO.CocktailLibraryIngredientDTO;
import com.bar.gestioncocktail.dto.CocktailWheelDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
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

    private CocktailWheelService cocktailWheelService;

    private static final String TEST_WHEEL_FILE = "data/establishment_connection_wheel.json";

    @BeforeEach
    void setUpTest() {
        try {
            java.nio.file.Files.deleteIfExists(java.nio.file.Path.of(TEST_WHEEL_FILE));
        } catch (java.io.IOException ignored) {
            // Ignored in test setup
        }
        ObjectMapper jsonMapper = new ObjectMapper();
        cocktailWheelService = new CocktailWheelService(
                cocktailRepository,
                jsonMapper,
                establishmentConfigService
        );
    }

    @AfterEach
    void cleanUpTestFile() {
        try {
            java.nio.file.Files.deleteIfExists(java.nio.file.Path.of(TEST_WHEEL_FILE));
        } catch (java.io.IOException ignored) {
            // Ignored in test cleanup
        }
    }

    @Test
    @DisplayName("getWheelData for LIBRARY scope should check module capability and return wheel data")
    void getWheelDataLibraryScopeSuccess() {
        CocktailWheelDTO.ConnectionWheelDTO result = cocktailWheelService.getWheelData(CocktailWheelScope.LIBRARY);

        assertThat(result).isNotNull();
        assertThat(result.categories()).isNotEmpty();
        verify(establishmentConfigService, times(1)).checkModuleEnabled(EstablishmentModule.COCKTAIL_LIBRARY);
    }

    @Test
    @DisplayName("getWheelData for LIBRARY scope should throw exception when module is disabled")
    void getWheelDataLibraryScopeDisabledModuleThrows() {
        doThrow(new BusinessException("Cocktail library module disabled"))
                .when(establishmentConfigService).checkModuleEnabled(EstablishmentModule.COCKTAIL_LIBRARY);

        assertThatThrownBy(() -> cocktailWheelService.getWheelData(CocktailWheelScope.LIBRARY))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Cocktail library module disabled");
    }

    @Test
    @DisplayName("generateLibraryWheel should compute node frequency and co-occurrence edges")
    void generateLibraryWheelComputesNodesAndEdges() {
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

        CocktailWheelDTO.ConnectionWheelDTO wheel = cocktailWheelService.generateLibraryWheel(List.of(mojito, daiquiri));

        assertThat(wheel).isNotNull();
        List<CocktailWheelDTO.NodeDTO> nodes = wheel.nodes();
        List<CocktailWheelDTO.EdgeDTO> edges = wheel.edges();

        assertThat(nodes).isNotNull().hasSize(3);

        // Rum and Lime should both have count 2, Mint should have count 1
        boolean foundRum = false;
        for (CocktailWheelDTO.NodeDTO n : nodes) {
            if ("white rum".equals(n.id())) {
                foundRum = true;
                assertThat(n.count()).isEqualTo(2);
                assertThat(n.group()).isEqualTo("light_liquor");
            }
        }
        assertThat(foundRum).isTrue();

        // Edge between White Rum and Lime Juice should have count 2
        assertThat(edges).isNotNull();
        boolean foundRumLimeEdge = false;
        for (CocktailWheelDTO.EdgeDTO e : edges) {
            String a = e.a();
            String b = e.b();
            if ((a.equals("lime juice") && b.equals("white rum")) || (a.equals("white rum") && b.equals("lime juice"))) {
                foundRumLimeEdge = true;
                assertThat(e.count()).isEqualTo(2);
            }
        }
        assertThat(foundRumLimeEdge).isTrue();
    }

    @Test
    @DisplayName("getWheelData for ESTABLISHMENT scope should regenerate from repository when cache is empty")
    void getWheelDataEstablishmentScopeGeneratesFromRepository() {
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

        CocktailWheelDTO.ConnectionWheelDTO wheel = cocktailWheelService.getWheelData(CocktailWheelScope.ESTABLISHMENT);

        assertThat(wheel).isNotNull();
        List<CocktailWheelDTO.NodeDTO> nodes = wheel.nodes();
        List<CocktailWheelDTO.EdgeDTO> edges = wheel.edges();

        assertThat(nodes).hasSize(2);
        assertThat(edges).hasSize(1);
        assertThat(edges.get(0).count()).isEqualTo(1);
    }

    @Test
    @DisplayName("generateLibraryWheel with null or empty list falls back to library wheel data")
    void generateLibraryWheelNullOrEmptyFallsBackToLibraryWheel() {
        CocktailWheelDTO.ConnectionWheelDTO resultNull = cocktailWheelService.generateLibraryWheel(null);
        CocktailWheelDTO.ConnectionWheelDTO resultEmpty = cocktailWheelService.generateLibraryWheel(Collections.emptyList());

        assertThat(resultNull).isNotNull();
        assertThat(resultEmpty).isNotNull();
        assertThat(resultNull).isEqualTo(resultEmpty);
    }

    @Test
    @DisplayName("regenerateEstablishmentWheel should fall back to findAll when findAllWithIngredients throws")
    void regenerateEstablishmentWheelQueryFailsFallsBackToFindAll() {
        when(cocktailRepository.findAllWithIngredients()).thenThrow(new RuntimeException("Query error"));
        when(cocktailRepository.findAll()).thenReturn(Collections.emptyList());

        CocktailWheelDTO.ConnectionWheelDTO wheel = cocktailWheelService.regenerateEstablishmentWheel();

        assertThat(wheel).isNotNull();
        verify(cocktailRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("regenerateEstablishmentWheel handles null ingredient names and unknown category fallback")
    void regenerateEstablishmentWheelHandlesEdgeCaseIngredients() {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(2L);
        cocktail.setNom("Exotic");

        Ingredient ingNullName = new Ingredient();
        ingNullName.setId(20L);
        ingNullName.setNom("   ");

        Ingredient ingUnknownCat = new Ingredient();
        ingUnknownCat.setId(21L);
        ingUnknownCat.setNom("Dragonfruit Syrup");
        ingUnknownCat.setCategory("unknown_category_xyz");

        CocktailIngredient ci1 = new CocktailIngredient();
        ci1.setCocktail(cocktail);
        ci1.setIngredient(ingNullName);

        CocktailIngredient ci2 = new CocktailIngredient();
        ci2.setCocktail(cocktail);
        ci2.setIngredient(ingUnknownCat);

        cocktail.setIngredients(new ArrayList<>(List.of(ci1, ci2)));
        when(cocktailRepository.findAllWithIngredients()).thenReturn(List.of(cocktail));

        CocktailWheelDTO.ConnectionWheelDTO wheel = cocktailWheelService.regenerateEstablishmentWheel();

        assertThat(wheel).isNotNull();
        List<CocktailWheelDTO.NodeDTO> nodes = wheel.nodes();
        assertThat(nodes).hasSize(1);
        assertThat(nodes.get(0).group()).isEqualTo("other");
    }

    @Test
    @DisplayName("getEstablishmentWheelData should read from persistent file when present")
    void getEstablishmentWheelDataReadsFromFile() {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(1L);
        cocktail.setNom("Mojito");
        Ingredient rum = new Ingredient();
        rum.setId(1L);
        rum.setNom("Rum");
        rum.setCategory("light_liquor");
        Ingredient lime = new Ingredient();
        lime.setId(2L);
        lime.setNom("Lime");
        lime.setCategory("fruits");

        CocktailIngredient ci1 = new CocktailIngredient();
        ci1.setCocktail(cocktail);
        ci1.setIngredient(rum);
        CocktailIngredient ci2 = new CocktailIngredient();
        ci2.setCocktail(cocktail);
        ci2.setIngredient(lime);
        cocktail.setIngredients(new ArrayList<>(List.of(ci1, ci2)));

        when(cocktailRepository.findAllWithIngredients()).thenReturn(List.of(cocktail));
        cocktailWheelService.regenerateEstablishmentWheel();

        cocktailWheelService.clearCaches();

        CocktailWheelDTO.ConnectionWheelDTO fromFile = cocktailWheelService.getEstablishmentWheelData();
        assertThat(fromFile).isNotNull();
        assertThat(fromFile.nodes()).hasSize(2);
    }
}

