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

    @Mock
    private org.springframework.core.env.Environment environment;

    private CocktailDataSeederService seederService;

    @BeforeEach
    void setUp() {
        seederService = new CocktailDataSeederService(
            cocktailRepository,
            ingredientRepository,
            cocktailIngredientRepository,
            cocktailVarianteRepository,
            glasswareRepository,
            environment
        );
    }

    @Test
    @DisplayName("seedCocktailsIfEmpty - skips startup auto-seeding in dev profile to keep database blank")
    void seedCocktailsIfEmpty_skipsSeedingWhenNotTestProfile() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});

        seederService.seedCocktailsIfEmpty();

        verify(cocktailRepository, never()).save(any(Cocktail.class));
    }

    @Test
    @DisplayName("seedCocktailsIfEmpty - imports cocktails with glassware and recipe steps when DB is empty and profile is test")
    void seedCocktailsIfEmpty_importsCocktailsWhenDbIsEmpty() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"test"});
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
    @DisplayName("seedCocktailsIfEmpty - maps all glassware types and creates ingredients/steps")
    void seedCocktailsIfEmpty_mapsAllGlasswareTypesAndVariantes() {
        Glassware g1 = new Glassware(); g1.setId(1L); g1.setNom("Tasse en cuivre");
        Glassware g2 = new Glassware(); g2.setId(2L); g2.setNom("Verre Margarita");
        Glassware g3 = new Glassware(); g3.setId(3L); g3.setNom("Flûte à Champagne");
        Glassware g4 = new Glassware(); g4.setId(4L); g4.setNom("Coupe à Cocktail / Martini");
        Glassware g5 = new Glassware(); g5.setId(5L); g5.setNom("Verre Ballon / Copa");
        Glassware g6 = new Glassware(); g6.setId(6L); g6.setNom("Verre Old Fashioned / Rocks");
        Glassware g7 = new Glassware(); g7.setId(7L); g7.setNom("Verre Tiki");
        Glassware g8 = new Glassware(); g8.setId(8L); g8.setNom("Verre à Shot / Chupito");
        Glassware g9 = new Glassware(); g9.setId(9L); g9.setNom("Verre Tumbler / Highball");

        when(environment.getActiveProfiles()).thenReturn(new String[]{"test"});
        when(glasswareRepository.findAll()).thenReturn(List.of(g1, g2, g3, g4, g5, g6, g7, g8, g9));
        when(cocktailRepository.count()).thenReturn(0L);
        when(cocktailRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(ingredientRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(invocation -> {
            Cocktail c = invocation.getArgument(0);
            c.setId(100L);
            return c;
        });
        when(ingredientRepository.save(any(Ingredient.class))).thenAnswer(invocation -> {
            Ingredient ing = invocation.getArgument(0);
            ing.setId(200L);
            return ing;
        });

        seederService.seedCocktailsIfEmpty();

        verify(cocktailRepository, atLeast(90)).save(any(Cocktail.class));
        verify(cocktailIngredientRepository, atLeastOnce()).save(any());
        verify(ingredientRepository, atLeastOnce()).save(any());
    }

    @Test
    @DisplayName("seedCocktailsIfEmpty - skips import when DB already contains cocktails")
    void seedCocktailsIfEmpty_skipsImportWhenDbIsNotEmpty() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"test"});
        when(cocktailRepository.count()).thenReturn(10L);

        seederService.seedCocktailsIfEmpty();

        verify(cocktailRepository, never()).save(any());
    }
}

