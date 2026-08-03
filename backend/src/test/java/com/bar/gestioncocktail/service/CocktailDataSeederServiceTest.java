package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.repository.CocktailIngredientRepository;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CocktailDataSeederServiceTest {

    @Mock
    private CocktailRepository cocktailRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private CocktailIngredientRepository cocktailIngredientRepository;

    private CocktailDataSeederService seederService;

    @BeforeEach
    void setUp() {
        seederService = new CocktailDataSeederService(
            cocktailRepository,
            ingredientRepository,
            cocktailIngredientRepository
        );
    }

    @Test
    void seedCocktailsIfEmpty_importsCocktailsWhenDbIsEmpty() {
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
    }

    @Test
    void seedCocktailsIfEmpty_skipsImportWhenDbIsNotEmpty() {
        when(cocktailRepository.count()).thenReturn(10L);

        seederService.seedCocktailsIfEmpty();

        verify(cocktailRepository, never()).save(any());
    }
}
