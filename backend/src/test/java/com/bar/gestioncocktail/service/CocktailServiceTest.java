package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CocktailRecipeStepRequestDTO;
import com.bar.gestioncocktail.dto.CocktailRequestDTO;
import com.bar.gestioncocktail.dto.CocktailResponseDTO;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.RecipeStepTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CocktailServiceTest {

    @Mock
    CocktailRepository cocktailRepository;

    @Mock
    IngredientRepository ingredientRepository;

    @Mock
    RecipeStepTemplateRepository templateRepository;

    @Spy
    TimeService timeService = new TimeService(null);

    @Mock
    FileUploadService fileUploadService;

    @InjectMocks
    CocktailService cocktailService;

    private Cocktail cocktail;

    @BeforeEach
    void setUp() {
        cocktail = new Cocktail();
        cocktail.setId(1L);
        cocktail.setNom("Mojito");
        cocktail.setDescription("Classic Cuban cocktail");
        cocktail.setPrix(new BigDecimal("8.50"));
        cocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        cocktail.setDisponible(true);
        cocktail.setSaisonnier(false);
        cocktail.setRecipeSteps(new ArrayList<>());
    }

    @Test
    @DisplayName("getAllCocktails - returns all cocktails from repository")
    void getAllCocktails_returnsAll() {
        when(cocktailRepository.findAll()).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.getAllCocktails();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNom()).isEqualTo("Mojito");
    }

    @Test
    @DisplayName("getCocktailById - returns cocktail when found")
    void getCocktailById_existant_retourneCocktail() {
        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));

        Optional<Cocktail> result = cocktailService.getCocktailById(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getNom()).isEqualTo("Mojito");
    }

    @Test
    @DisplayName("getCocktailById - returns empty when not found")
    void getCocktailById_inexistant_retourneEmpty() {
        when(cocktailRepository.findById(99L)).thenReturn(Optional.empty());

        Optional<Cocktail> result = cocktailService.getCocktailById(99L);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("createCocktail - saves and returns entity")
    void createCocktail_sauvegarde_etRetourne() {
        Cocktail nouveau = new Cocktail();
        nouveau.setNom("Margarita");
        nouveau.setPrix(new BigDecimal("9.00"));
        nouveau.setCategorie(CocktailCategorie.ALCOOLISE);

        when(cocktailRepository.save(any(Cocktail.class))).thenReturn(nouveau);

        Cocktail result = cocktailService.createCocktail(nouveau);

        assertThat(result.getNom()).isEqualTo("Margarita");
        verify(cocktailRepository, times(1)).save(nouveau);
    }

    @Test
    @DisplayName("createCocktailFromRequest - creates cocktail with recipe steps mapping ingredients and templates")
    void createCocktailFromRequest_withRecipeSteps_mapsAndSaves() {
        Ingredient rum = new Ingredient();
        rum.setId(10L);
        rum.setNom("White Rum");
        rum.setUniteMesure("cl");

        RecipeStepTemplate shakeTemplate = new RecipeStepTemplate();
        shakeTemplate.setId(20L);
        shakeTemplate.setName("Shake vigorously");
        shakeTemplate.setActionType(RecipeStepActionType.SHAKE);
        shakeTemplate.setDefaultDurationSeconds(15);

        when(ingredientRepository.findById(10L)).thenReturn(Optional.of(rum));
        when(templateRepository.findById(20L)).thenReturn(Optional.of(shakeTemplate));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(inv -> {
            Cocktail c = inv.getArgument(0);
            c.setId(42L);
            return c;
        });

        CocktailRecipeStepRequestDTO step1 = new CocktailRecipeStepRequestDTO(
            1, RecipeStepType.INGREDIENT, 10L, new BigDecimal("5.0"), "cl", null, null, null, null
        );
        CocktailRecipeStepRequestDTO step2 = new CocktailRecipeStepRequestDTO(
            2, RecipeStepType.ACTION_TEMPLATE, null, null, null, 20L, null, null, 15
        );
        CocktailRecipeStepRequestDTO step3 = new CocktailRecipeStepRequestDTO(
            3, RecipeStepType.CUSTOM_TEXT, null, null, null, null, "Garnish with mint sprig", "Express mint oils", 5
        );

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito Deluxe", "Fresh mint and rum", new BigDecimal("9.50"),
            CocktailCategorie.ALCOOLISE, true, false, null, null, null, null,
            "Shake and pour", "http://photo.url", List.of(step1, step2, step3)
        );

        CocktailResponseDTO response = cocktailService.createCocktailFromRequest(request);

        assertThat(response).isNotNull();
        assertThat(response.nom()).isEqualTo("Mojito Deluxe");
        assertThat(response.recipeSteps()).hasSize(3);
        verify(cocktailRepository, times(1)).save(any(Cocktail.class));
    }

    @Test
    @DisplayName("createCocktailFromRequest - creates cocktail without recipe steps")
    void createCocktailFromRequest_withoutSteps() {
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(inv -> {
            Cocktail c = inv.getArgument(0);
            c.setId(43L);
            return c;
        });

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Virgin Colada", "Pineapple and coconut", new BigDecimal("6.00"),
            CocktailCategorie.SANS_ALCOOL, true, false, null, null, null, null,
            null, null, null
        );

        CocktailResponseDTO response = cocktailService.createCocktailFromRequest(request);

        assertThat(response).isNotNull();
        assertThat(response.nom()).isEqualTo("Virgin Colada");
        verify(cocktailRepository, times(1)).save(any(Cocktail.class));
    }

    @Test
    @DisplayName("updateCocktail - updates existing cocktail entity")
    void updateCocktail_existant_miseAJour() {
        cocktail.setNom("Mojito Revisited");
        when(cocktailRepository.save(any(Cocktail.class))).thenReturn(cocktail);

        Cocktail result = cocktailService.updateCocktail(cocktail);

        assertThat(result.getNom()).isEqualTo("Mojito Revisited");
        verify(cocktailRepository, times(1)).save(cocktail);
    }

    @Test
    @DisplayName("updateCocktailFromRequest - updates cocktail and replaces recipe steps")
    void updateCocktailFromRequest_updatesExistingCocktail() {
        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(inv -> inv.getArgument(0));

        CocktailRecipeStepRequestDTO step = new CocktailRecipeStepRequestDTO(
            1, RecipeStepType.CUSTOM_TEXT, null, null, null, null, "Pour into highball glass", "Add crushed ice", 10
        );

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito Classic", "Updated description", new BigDecimal("10.00"),
            CocktailCategorie.ALCOOLISE, true, true, LocalDateTime.now(), LocalDateTime.now().plusMonths(3),
            6, 9, "Build in glass", "http://image.png", List.of(step)
        );

        CocktailResponseDTO response = cocktailService.updateCocktailFromRequest(1L, request);

        assertThat(response).isNotNull();
        assertThat(response.nom()).isEqualTo("Mojito Classic");
        assertThat(response.recipeSteps()).hasSize(1);
        verify(cocktailRepository, times(1)).save(cocktail);
    }

    @Test
    @DisplayName("updateCocktailFromRequest - throws ResourceNotFoundException when cocktail missing")
    void updateCocktailFromRequest_notFound_throwsException() {
        when(cocktailRepository.findById(99L)).thenReturn(Optional.empty());

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Missing", "Desc", new BigDecimal("5.0"), CocktailCategorie.SHOT, true, false,
            null, null, null, null, null, null, null
        );

        assertThatThrownBy(() -> cocktailService.updateCocktailFromRequest(99L, request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("99");
    }

    @Test
    @DisplayName("deleteCocktail - deletes by ID")
    void deleteCocktail_existant_supprime() {
        cocktailService.deleteCocktail(1L);

        verify(cocktailRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("toggleDisponibilite - toggles availability flag")
    void toggleDisponibilite_basculeLaValeur() {
        assertThat(cocktail.isDisponible()).isTrue();
        when(cocktailRepository.save(any(Cocktail.class))).thenReturn(cocktail);

        cocktailService.toggleDisponibilite(cocktail);

        assertThat(cocktail.isDisponible()).isFalse();
        verify(cocktailRepository, times(1)).save(cocktail);
    }

    @Test
    @DisplayName("getCocktailsByCategorie - finds cocktails by category")
    void getCocktailsByCategorie_returnsMatching() {
        when(cocktailRepository.findByCategorie(CocktailCategorie.ALCOOLISE)).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.getCocktailsByCategorie(CocktailCategorie.ALCOOLISE);

        assertThat(result).hasSize(1);
        verify(cocktailRepository, times(1)).findByCategorie(CocktailCategorie.ALCOOLISE);
    }

    @Test
    @DisplayName("getCocktailsDisponibles - filters available cocktails")
    void getCocktailsDisponibles_filtreSurDisponible() {
        when(cocktailRepository.findByDisponible(true)).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.getCocktailsDisponibles();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNom()).isEqualTo("Mojito");
    }

    @Test
    @DisplayName("getCocktailsSaisonniers - returns seasonal cocktails")
    void getCocktailsSaisonniers_returnsSeasonal() {
        cocktail.setSaisonnier(true);
        when(cocktailRepository.findBySaisonnier(true)).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.getCocktailsSaisonniers();

        assertThat(result).hasSize(1);
        verify(cocktailRepository, times(1)).findBySaisonnier(true);
    }

    @Test
    @DisplayName("getCocktailsSaisonniersActuels - returns currently seasonal cocktails")
    void getCocktailsSaisonniersActuels_returnsActiveSeasonal() {
        when(cocktailRepository.findBySaisonnierAndDateDebutSaisonBeforeAndDateFinSaisonAfter(
            eq(true), any(LocalDateTime.class), any(LocalDateTime.class)
        )).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.getCocktailsSaisonniersActuels();

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("searchCocktails - performs case-insensitive name search")
    void searchCocktails_returnsMatching() {
        when(cocktailRepository.findByNomContainingIgnoreCase("moji")).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.searchCocktails("moji");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNom()).isEqualTo("Mojito");
    }

    @Test
    @DisplayName("definirSaisonnalite - sets exact date bounds")
    void definirSaisonnalite_setsDatesAndSaves() {
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = start.plusMonths(2);
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> i.getArgument(0));

        cocktailService.definirSaisonnalite(cocktail, start, end);

        assertThat(cocktail.isSaisonnier()).isTrue();
        assertThat(cocktail.getDateDebutSaison()).isEqualTo(start);
        assertThat(cocktail.getDateFinSaison()).isEqualTo(end);
        verify(cocktailRepository, times(1)).save(cocktail);
    }

    @Test
    @DisplayName("updateSaisonnalite - updates month numbers and seasonality")
    void updateSaisonnalite_updatesMonths() {
        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> i.getArgument(0));

        Cocktail updated = cocktailService.updateSaisonnalite(1L, 6, 8);

        assertThat(updated.getMoisDebut()).isEqualTo(6);
        assertThat(updated.getMoisFin()).isEqualTo(8);
        assertThat(updated.isSaisonnier()).isTrue();
    }

    @Test
    @DisplayName("updateSaisonnalite - throws ResourceNotFoundException for missing cocktail")
    void updateSaisonnalite_cocktailInexistant_throwsResourceNotFoundException() {
        when(cocktailRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cocktailService.updateSaisonnalite(99L, 6, 8))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("99");
    }

    @Test
    @DisplayName("updateCocktailImage - saves photo and updates entity")
    void updateCocktailImage_sauvegardePhotoEtMetAJourCocktail() {
        MockMultipartFile file = new MockMultipartFile("file", "mojito.jpg", "image/jpeg", "bytes".getBytes());
        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));
        when(fileUploadService.storeCocktailPhoto(1L, file)).thenReturn("/uploads/cocktails/cocktail_1_abc.jpg");
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> i.getArgument(0));

        Cocktail updated = cocktailService.updateCocktailImage(1L, file);

        assertThat(updated.getImageUrl()).isEqualTo("/uploads/cocktails/cocktail_1_abc.jpg");
        verify(fileUploadService, times(1)).storeCocktailPhoto(1L, file);
        verify(cocktailRepository, times(1)).save(cocktail);
    }
}
