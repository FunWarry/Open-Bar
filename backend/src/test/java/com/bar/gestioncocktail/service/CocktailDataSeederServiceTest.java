package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.Glassware;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.repository.CocktailIngredientRepository;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CocktailVarianteRepository;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CocktailDataSeederService}.
 */
@ExtendWith(MockitoExtension.class)
class CocktailDataSeederServiceTest {

    @Mock
    private CocktailRepository cocktailRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private CocktailIngredientRepository cocktailIngredientRepository;

    @Mock
    private CocktailVarianteRepository cocktailVarianteRepository;

    @Mock
    private GlasswareRepository glasswareRepository;

    private CocktailDataSeederService seederService;

    @BeforeEach
    void setUp() {
        seederService = new CocktailDataSeederService(
            cocktailRepository,
            ingredientRepository,
            cocktailIngredientRepository,
            cocktailVarianteRepository,
            glasswareRepository
        );
    }

    @Test
    @DisplayName("seedCocktailsIfEmpty - imports cocktails with glassware and recipe steps when DB is empty")
    void seedCocktailsIfEmpty_importsCocktailsWhenDbIsEmpty() {
        Glassware mockGlassware = new Glassware();
        mockGlassware.setId(1L);
        mockGlassware.setNom("Tasse en cuivre");
        mockGlassware.setContenanceCl(new BigDecimal("40.0"));
        when(glasswareRepository.findAll()).thenReturn(List.of(mockGlassware));

        when(cocktailRepository.count()).thenReturn(0L);
        when(cocktailRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(ingredientRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(invocation -> {
            Cocktail c = invocation.getArgument(0);
            if (c.getId() == null) {
                c.setId(100L);
            }
            return c;
        });
        when(ingredientRepository.save(any(Ingredient.class))).thenAnswer(invocation -> {
            Ingredient ing = invocation.getArgument(0);
            if (ing.getId() == null) {
                ing.setId(200L);
            }
            return ing;
        });

        seederService.seedCocktailsIfEmpty();

        ArgumentCaptor<Cocktail> cocktailCaptor = ArgumentCaptor.forClass(Cocktail.class);
        verify(cocktailRepository, atLeast(90)).save(cocktailCaptor.capture());

        Cocktail firstCocktail = cocktailCaptor.getAllValues().get(0);
        assertThat(firstCocktail.getNom()).isEqualTo("Aulp");
        assertThat(firstCocktail.getPrix()).isNotNull();
        assertThat(firstCocktail.getDescription()).contains("Tasse");
        assertThat(firstCocktail.getGlassware()).isNotNull();
        assertThat(firstCocktail.getGlassware().getNom()).isEqualTo("Tasse en cuivre");
        assertThat(firstCocktail.getVatRate()).isNotNull();
    }

    @Test
    @DisplayName("seedCocktailsIfEmpty - skips import when DB already contains cocktails")
    void seedCocktailsIfEmpty_skipsImportWhenDbIsNotEmpty() {
        when(cocktailRepository.count()).thenReturn(10L);

        seederService.seedCocktailsIfEmpty();

        verify(cocktailRepository, never()).save(any());
    }
}

