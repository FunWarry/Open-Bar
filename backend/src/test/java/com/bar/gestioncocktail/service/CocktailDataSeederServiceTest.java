package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CocktailDataSeederServiceTest {

    @Mock
    CocktailRepository cocktailRepository;

    @Mock
    IngredientRepository ingredientRepository;

    @Mock
    CocktailIngredientRepository cocktailIngredientRepository;

    @Mock
    CocktailVarianteRepository cocktailVarianteRepository;

    @Mock
    GlasswareRepository glasswareRepository;

    @Mock
    Environment environment;

    CocktailDataSeederService seederService;

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
    @DisplayName("seedCocktailsIfEmpty skips seeding when profile is not test")
    void seedCocktailsIfEmpty_skipsWhenNotTestProfile() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});

        seederService.seedCocktailsIfEmpty();

        verify(cocktailRepository, never()).count();
        verify(cocktailRepository, never()).save(any());
    }

    @Test
    @DisplayName("seedCocktailsIfEmpty skips seeding when database already contains cocktails")
    void seedCocktailsIfEmpty_skipsWhenNotEmpty() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"test"});
        when(cocktailRepository.count()).thenReturn(10L);

        seederService.seedCocktailsIfEmpty();

        verify(cocktailRepository).count();
        verify(cocktailRepository, never()).save(any());
    }

    @Test
    @DisplayName("seedCocktailsIfEmpty seeds cocktails when database is empty in test profile")
    void seedCocktailsIfEmpty_seedsSuccessfully() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"test"});
        when(cocktailRepository.count()).thenReturn(0L);
        when(glasswareRepository.findAll()).thenReturn(List.of());
        when(cocktailRepository.findByNomIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(inv -> inv.getArgument(0));

        seederService.seedCocktailsIfEmpty();

        ArgumentCaptor<Cocktail> captor = ArgumentCaptor.forClass(Cocktail.class);
        verify(cocktailRepository, atLeastOnce()).save(captor.capture());

        List<Cocktail> saved = captor.getAllValues();
        assertThat(saved).isNotEmpty();
        // Check that flavor profiles and dietary flags are initialized
        Cocktail first = saved.get(0);
        assertThat(first.getFlavorProfiles()).isNotNull();
        assertThat(first.getAlcoholLevel()).isNotNull();
    }
}
