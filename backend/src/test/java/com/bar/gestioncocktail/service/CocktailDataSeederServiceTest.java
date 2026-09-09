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
import java.util.Set;

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

    @Test
    @DisplayName("detectFlavorProfilesForCocktail detects correct profiles from entity fields")
    void detectFlavorProfilesForCocktail_detectsCorrectProfiles() {
        Cocktail c = new Cocktail();
        c.setNom("Smoky Herbal Mezcal Sour");
        c.setDescription("A smoky artisanal drink with fresh lemon, ginger and mint");

        Ingredient ing1 = new Ingredient();
        ing1.setNom("Mezcal");

        Ingredient ing2 = new Ingredient();
        ing2.setNom("Citron");

        CocktailIngredient ci1 = new CocktailIngredient();
        ci1.setIngredient(ing1);
        CocktailIngredient ci2 = new CocktailIngredient();
        ci2.setIngredient(ing2);
        c.setIngredients(List.of(ci1, ci2));

        Set<FlavorProfile> profiles = seederService.detectFlavorProfilesForCocktail(c);
        assertThat(profiles).contains(FlavorProfile.SMOKY, FlavorProfile.SOUR, FlavorProfile.HERBAL, FlavorProfile.SPICY);
    }

    @Test
    @DisplayName("detectFlavorProfilesForCocktail returns default FRUITY for null cocktail")
    void detectFlavorProfilesForCocktail_handlesNull() {
        Set<FlavorProfile> profiles = seederService.detectFlavorProfilesForCocktail(null);
        assertThat(profiles).containsExactly(FlavorProfile.FRUITY);
    }

    @Test
    @DisplayName("detectFlavorProfilesFromText recognizes all flavor profiles")
    void detectFlavorProfilesFromText_recognizesAllProfiles() {
        assertThat(CocktailDataSeederService.detectFlavorProfilesFromText(null)).containsExactly(FlavorProfile.FRUITY);

        Set<FlavorProfile> all = CocktailDataSeederService.detectFlavorProfilesFromText(
            "jus de fraise, citron acid, sirop de sucre vanille, angostura bitter tonic, cannelle chili, mezcal fumé tourbe, menthe thym gin"
        );
        assertThat(all).contains(
            FlavorProfile.FRUITY,
            FlavorProfile.SOUR,
            FlavorProfile.SWEET,
            FlavorProfile.BITTER,
            FlavorProfile.SPICY,
            FlavorProfile.SMOKY,
            FlavorProfile.HERBAL
        );
    }

    @Test
    @DisplayName("ensureIngredientAllergensPopulated updates ingredients without allergens")
    void ensureIngredientAllergensPopulated_populatesAllergens() {
        Ingredient ing = new Ingredient();
        ing.setNom("Lait");
        ing.setAllergens(new java.util.HashSet<>());

        when(ingredientRepository.findAll()).thenReturn(List.of(ing));

        seederService.ensureIngredientAllergensPopulated();

        verify(ingredientRepository, atLeastOnce()).findAll();
    }

    @Test
    @DisplayName("ensureIngredientAllergensPopulated skips when repository is empty")
    void ensureIngredientAllergensPopulated_skipsWhenEmpty() {
        when(ingredientRepository.findAll()).thenReturn(List.of());
        seederService.ensureIngredientAllergensPopulated();
        verify(ingredientRepository, never()).save(any());
    }

    @Test
    @DisplayName("ensureFlavorProfilesPopulated backfills cocktails with empty profiles")
    void ensureFlavorProfilesPopulated_backfillsEmptyProfiles() {
        Cocktail c1 = new Cocktail();
        c1.setNom("Mojito");
        c1.setFlavorProfiles(new java.util.HashSet<>());

        Cocktail c2 = new Cocktail();
        c2.setNom("Custom NonDataset Cocktail");
        c2.setDescription("A smoky herbal concoction");
        c2.setFlavorProfiles(null);

        Cocktail c3 = new Cocktail();
        c3.setNom("Already Populated");
        c3.setFlavorProfiles(Set.of(FlavorProfile.SWEET));

        when(cocktailRepository.findAll()).thenReturn(List.of(c1, c2, c3));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(inv -> inv.getArgument(0));

        seederService.ensureFlavorProfilesPopulated();

        verify(cocktailRepository, atLeast(2)).save(any(Cocktail.class));
        assertThat(c1.getFlavorProfiles()).isNotEmpty();
        assertThat(c2.getFlavorProfiles()).isNotEmpty();
    }

    @Test
    @DisplayName("ensureFlavorProfilesPopulated skips when repository is empty")
    void ensureFlavorProfilesPopulated_skipsWhenEmpty() {
        when(cocktailRepository.findAll()).thenReturn(List.of());
        seederService.ensureFlavorProfilesPopulated();
        verify(cocktailRepository, never()).save(any());
    }
}

