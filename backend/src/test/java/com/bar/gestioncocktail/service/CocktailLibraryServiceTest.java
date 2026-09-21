package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CocktailLibraryImportRequestDTO;
import com.bar.gestioncocktail.dto.CocktailLibraryImportResultDTO;
import com.bar.gestioncocktail.dto.CocktailLibraryItemDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailIngredientRepository;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.GlasswareRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CocktailLibraryService}.
 * Validates dataset loading, facet filtering, recipe import, inventory deduplication, and module security checks.
 */
@ExtendWith(MockitoExtension.class)
class CocktailLibraryServiceTest {

    @Mock
    private CocktailRepository cocktailRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private CocktailIngredientRepository cocktailIngredientRepository;

    @Mock
    private GlasswareRepository glasswareRepository;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    private CocktailLibraryService cocktailLibraryService;
    private final AtomicLong idGenerator = new AtomicLong(100);

    private Glassware defaultGlassware;

    @BeforeEach
    void setUp() {
        cocktailLibraryService = new CocktailLibraryService(
                cocktailRepository,
                ingredientRepository,
                cocktailIngredientRepository,
                glasswareRepository,
                establishmentConfigService
        );
        cocktailLibraryService.initLibrary();

        defaultGlassware = new Glassware();
        defaultGlassware.setId(1L);
        defaultGlassware.setNom("Verre Tumbler");
    }

    @Test
    @DisplayName("Should initialize and load base cocktail library dataset")
    void shouldInitializeLibrary() {
        List<CocktailLibraryItemDTO> all = cocktailLibraryService.getLibrary(null, null, null, null, null);
        assertThat(all).isNotEmpty().hasSizeGreaterThanOrEqualTo(50);

        CocktailLibraryItemDTO first = all.get(0);
        assertThat(first).isNotNull();
        assertThat(first.nom()).isNotBlank();
        assertThat(first.ingredients()).isNotEmpty();
    }

    @Test
    @DisplayName("Should filter library cocktails by category")
    void shouldFilterByCategory() {
        List<CocktailLibraryItemDTO> contemporary = cocktailLibraryService.getLibrary("CONTEMPORARY", null, null, null, null);
        assertThat(contemporary).isNotEmpty().allMatch(c -> "CONTEMPORARY".equalsIgnoreCase(c.libraryCategory()) || "CONTEMPORARY".equalsIgnoreCase(c.categorie()));
    }

    @Test
    @DisplayName("Should filter library cocktails by base spirit")
    void shouldFilterByBaseSpirit() {
        List<CocktailLibraryItemDTO> rumDrinks = cocktailLibraryService.getLibrary(null, "OTHER", null, null, null);
        assertThat(rumDrinks).isNotEmpty().allMatch(c -> "OTHER".equalsIgnoreCase(c.baseSpirit()));
    }

    @Test
    @DisplayName("Should filter library cocktails by mocktail flag")
    void shouldFilterByMocktail() {
        List<CocktailLibraryItemDTO> mocktails = cocktailLibraryService.getLibrary(null, null, null, true, null);
        assertThat(mocktails).isNotEmpty().allMatch(c -> Boolean.TRUE.equals(c.isMocktail()));

        List<CocktailLibraryItemDTO> alcoholic = cocktailLibraryService.getLibrary(null, null, null, false, null);
        assertThat(alcoholic).isNotEmpty().allMatch(c -> Boolean.FALSE.equals(c.isMocktail()));
    }

    @Test
    @DisplayName("Should filter library cocktails by search keyword")
    void shouldFilterBySearch() {
        List<CocktailLibraryItemDTO> results = cocktailLibraryService.getLibrary(null, null, null, null, "apple");
        assertThat(results).isNotEmpty().anyMatch(c -> c.nom().toLowerCase().contains("apple"));
    }

    @Test
    @DisplayName("Should import cocktail and create new ingredients when none exist")
    void shouldImportCocktailWithNewIngredients() {
        when(cocktailRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(ingredientRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(glasswareRepository.findAll()).thenReturn(List.of(defaultGlassware));

        when(ingredientRepository.save(any(Ingredient.class))).thenAnswer(invocation -> {
            Ingredient ing = invocation.getArgument(0);
            ing.setId(idGenerator.incrementAndGet());
            return ing;
        });

        when(cocktailIngredientRepository.save(any(CocktailIngredient.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(invocation -> {
            Cocktail c = invocation.getArgument(0);
            if (c.getId() == null) {
                c.setId(10L);
            }
            return c;
        });

        CocktailLibraryImportRequestDTO request = new CocktailLibraryImportRequestDTO(List.of("lib_1"), null);
        CocktailLibraryImportResultDTO result = cocktailLibraryService.importCocktails(request);

        assertThat(result.importedCount()).isEqualTo(1);
        assertThat(result.skippedCount()).isZero();
        assertThat(result.newIngredientsCount()).isGreaterThan(0);
        assertThat(result.reusedIngredientsCount()).isZero();
        assertThat(result.importedCocktails()).contains("Aulp");

        verify(cocktailRepository, atLeastOnce()).save(any(Cocktail.class));
        verify(cocktailIngredientRepository, atLeastOnce()).save(any(CocktailIngredient.class));
    }

    @Test
    @DisplayName("Should reuse existing ingredients and avoid creating duplicates during import")
    void shouldReuseExistingIngredients() {
        when(cocktailRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());

        Ingredient existingGrapeJuice = new Ingredient();
        existingGrapeJuice.setId(5L);
        existingGrapeJuice.setNom("Jus de Raisin");
        existingGrapeJuice.setUniteMesure("cl");
        existingGrapeJuice.setQuantiteStock(BigDecimal.valueOf(100.0));
        existingGrapeJuice.setCategory("juices");

        when(ingredientRepository.findByNomIgnoreCase("Jus de Raisin")).thenReturn(Optional.of(existingGrapeJuice));
        when(ingredientRepository.findByNomIgnoreCase(argThat(name -> !"Jus de Raisin".equalsIgnoreCase(name))))
                .thenReturn(Optional.empty());

        when(glasswareRepository.findAll()).thenReturn(List.of(defaultGlassware));

        when(ingredientRepository.save(any(Ingredient.class))).thenAnswer(invocation -> {
            Ingredient ing = invocation.getArgument(0);
            ing.setId(idGenerator.incrementAndGet());
            return ing;
        });

        when(cocktailIngredientRepository.save(any(CocktailIngredient.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(invocation -> {
            Cocktail c = invocation.getArgument(0);
            if (c.getId() == null) {
                c.setId(11L);
            }
            return c;
        });

        CocktailLibraryImportRequestDTO request = new CocktailLibraryImportRequestDTO(List.of("lib_1"), null);
        CocktailLibraryImportResultDTO result = cocktailLibraryService.importCocktails(request);

        assertThat(result.importedCount()).isEqualTo(1);
        assertThat(result.reusedIngredientsCount()).isEqualTo(1);

        ArgumentCaptor<Ingredient> ingredientCaptor = ArgumentCaptor.forClass(Ingredient.class);
        verify(ingredientRepository, atLeastOnce()).save(ingredientCaptor.capture());
        List<Ingredient> savedIngredients = ingredientCaptor.getAllValues();
        assertThat(savedIngredients).noneMatch(i -> "Jus de Raisin".equalsIgnoreCase(i.getNom()));
    }

    @Test
    @DisplayName("Should skip already existing cocktail by name")
    void shouldSkipAlreadyExistingCocktail() {
        Cocktail existingAulp = new Cocktail();
        existingAulp.setId(1L);
        existingAulp.setNom("Aulp");

        when(cocktailRepository.findByNomIgnoreCase("Aulp")).thenReturn(Optional.of(existingAulp));

        CocktailLibraryImportRequestDTO request = new CocktailLibraryImportRequestDTO(List.of("lib_1"), null);
        CocktailLibraryImportResultDTO result = cocktailLibraryService.importCocktails(request);

        assertThat(result.importedCount()).isZero();
        assertThat(result.skippedCount()).isEqualTo(1);
        assertThat(result.skippedCocktails()).contains("Aulp");

        verify(cocktailRepository, never()).save(any(Cocktail.class));
    }

    @Test
    @DisplayName("Should reject import when COCKTAIL_LIBRARY module is disabled")
    void shouldRejectWhenModuleDisabled() {
        doThrow(new BusinessException("Module COCKTAIL_LIBRARY is disabled"))
                .when(establishmentConfigService).checkModuleEnabled(EstablishmentModule.COCKTAIL_LIBRARY);

        CocktailLibraryImportRequestDTO request = new CocktailLibraryImportRequestDTO(List.of("lib_1"), null);

        assertThatThrownBy(() -> cocktailLibraryService.importCocktails(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("COCKTAIL_LIBRARY");

        verify(cocktailRepository, never()).save(any(Cocktail.class));
    }

    @Test
    @DisplayName("Should filter library cocktails by flavor profile")
    void shouldFilterByFlavor() {
        List<CocktailLibraryItemDTO> results = cocktailLibraryService.getLibrary(null, null, "HERBAL", null, null);
        assertThat(results).isNotEmpty().allSatisfy(c ->
                assertThat(c.flavorProfiles()).contains("HERBAL")
        );
    }

    @Test
    @DisplayName("Should import cocktails by cocktail names instead of ids")
    void shouldImportCocktailsByName() {
        when(cocktailRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(ingredientRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(glasswareRepository.findAll()).thenReturn(List.of(defaultGlassware));

        when(ingredientRepository.save(any(Ingredient.class))).thenAnswer(invocation -> {
            Ingredient ing = invocation.getArgument(0);
            ing.setId(idGenerator.incrementAndGet());
            return ing;
        });
        when(cocktailIngredientRepository.save(any(CocktailIngredient.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(invocation -> {
            Cocktail c = invocation.getArgument(0);
            if (c.getId() == null) {
                c.setId(20L);
            }
            return c;
        });

        CocktailLibraryImportRequestDTO request = new CocktailLibraryImportRequestDTO(null, List.of("Aulp"));
        CocktailLibraryImportResultDTO result = cocktailLibraryService.importCocktails(request);

        assertThat(result.importedCount()).isEqualTo(1);
        assertThat(result.importedCocktails()).contains("Aulp");
    }

    @Test
    @DisplayName("Should handle import when glassware repository is empty")
    void shouldImportWithFallbackGlassware() {
        when(cocktailRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(ingredientRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(glasswareRepository.findAll()).thenReturn(Collections.emptyList());

        when(ingredientRepository.save(any(Ingredient.class))).thenAnswer(invocation -> {
            Ingredient ing = invocation.getArgument(0);
            ing.setId(idGenerator.incrementAndGet());
            return ing;
        });
        when(cocktailIngredientRepository.save(any(CocktailIngredient.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(invocation -> {
            Cocktail c = invocation.getArgument(0);
            if (c.getId() == null) {
                c.setId(21L);
            }
            return c;
        });

        CocktailLibraryImportRequestDTO request = new CocktailLibraryImportRequestDTO(List.of("lib_1"), null);
        CocktailLibraryImportResultDTO result = cocktailLibraryService.importCocktails(request);

        assertThat(result.importedCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should safely handle non-existent cocktail IDs or names in import request")
    void shouldHandleNonExistentItemInImport() {
        CocktailLibraryImportRequestDTO request = new CocktailLibraryImportRequestDTO(
                List.of("non_existent_id"),
                List.of("Non Existent Drink", "")
        );
        CocktailLibraryImportResultDTO result = cocktailLibraryService.importCocktails(request);

        assertThat(result.importedCount()).isZero();
        assertThat(result.skippedCount()).isZero();
        verify(cocktailRepository, never()).save(any(Cocktail.class));
    }
}
