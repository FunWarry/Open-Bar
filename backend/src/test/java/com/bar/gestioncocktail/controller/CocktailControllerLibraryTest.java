package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailLibraryImportRequestDTO;
import com.bar.gestioncocktail.dto.CocktailLibraryImportResultDTO;
import com.bar.gestioncocktail.dto.CocktailLibraryItemDTO;
import com.bar.gestioncocktail.service.CocktailLibraryService;
import com.bar.gestioncocktail.service.CocktailService;
import com.bar.gestioncocktail.service.MarginCalculationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for cocktail library endpoints in {@link CocktailController}.
 */
@ExtendWith(MockitoExtension.class)
class CocktailControllerLibraryTest {

    @Mock
    private CocktailService cocktailService;

    @Mock
    private MarginCalculationService marginCalculationService;

    @Mock
    private CocktailLibraryService cocktailLibraryService;

    @InjectMocks
    private CocktailController cocktailController;

    private CocktailLibraryItemDTO sampleItem;

    @BeforeEach
    void setUp() {
        sampleItem = new CocktailLibraryItemDTO(
                "lib_1",
                "Mojito",
                "Classic Cuban cocktail",
                "ALCOOLISE",
                "CLASSIC",
                "RUM",
                true,
                BigDecimal.valueOf(9.0),
                BigDecimal.valueOf(12.0),
                false,
                true,
                true,
                "Tumbler",
                "verre_tumbler.png",
                "assets/images/verres/verre_tumbler.png",
                List.of("MINT", "CITRUS"),
                Collections.emptyList(),
                60,
                List.of("classic", "summer"),
                Collections.emptyList(),
                Collections.emptyList(),
                "Mix and serve"
        );
    }

    @Test
    @DisplayName("GET /api/cocktails/library - should delegate to CocktailLibraryService and return library items")
    void shouldGetLibrary() {
        when(cocktailLibraryService.getLibrary("CLASSIC", "RUM", "CITRUS", false, "mojito"))
                .thenReturn(List.of(sampleItem));

        ResponseEntity<List<CocktailLibraryItemDTO>> response = cocktailController.getLibraryCocktails(
                "CLASSIC", "RUM", "CITRUS", false, "mojito"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).nom()).isEqualTo("Mojito");

        verify(cocktailLibraryService, times(1))
                .getLibrary("CLASSIC", "RUM", "CITRUS", false, "mojito");
    }

    @Test
    @DisplayName("POST /api/cocktails/library/import - should delegate to CocktailLibraryService and return import result")
    void shouldImportCocktails() {
        CocktailLibraryImportRequestDTO request = new CocktailLibraryImportRequestDTO(List.of("lib_1"), null);
        CocktailLibraryImportResultDTO result = new CocktailLibraryImportResultDTO(
                1,
                0,
                4,
                0,
                List.of("Mojito"),
                Collections.emptyList(),
                "1 cocktail(s) and 4 ingredient(s) imported."
        );

        when(cocktailLibraryService.importCocktails(any(CocktailLibraryImportRequestDTO.class)))
                .thenReturn(result);

        ResponseEntity<CocktailLibraryImportResultDTO> response = cocktailController.importLibraryCocktails(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().importedCount()).isEqualTo(1);
        assertThat(response.getBody().newIngredientsCount()).isEqualTo(4);
        assertThat(response.getBody().importedCocktails()).contains("Mojito");

        verify(cocktailLibraryService, times(1)).importCocktails(request);
    }
}
