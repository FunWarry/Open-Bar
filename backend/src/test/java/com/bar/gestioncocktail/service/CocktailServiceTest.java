package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CocktailRecipeStepRequestDTO;
import com.bar.gestioncocktail.dto.CocktailRequestDTO;
import com.bar.gestioncocktail.dto.CocktailResponseDTO;
import com.bar.gestioncocktail.dto.CocktailVarianteIngredientRequestDTO;
import com.bar.gestioncocktail.dto.CocktailVarianteRequestDTO;
import com.bar.gestioncocktail.dto.CocktailVarianteResponseDTO;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CommandeItemRepository;
import com.bar.gestioncocktail.repository.GlasswareRepository;
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
import java.time.Month;
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
    CommandeItemRepository commandeItemRepository;

    @Mock
    IngredientRepository ingredientRepository;

    @Mock
    RecipeStepTemplateRepository templateRepository;

    @Mock
    GlasswareRepository glasswareRepository;

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

    @Test
    @DisplayName("updateCocktailImage - throws ResourceNotFoundException when cocktail is missing")
    void updateCocktailImage_throwsWhenNotFound() {
        MockMultipartFile file = new MockMultipartFile("file", "mojito.jpg", "image/jpeg", "bytes".getBytes());
        when(cocktailRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cocktailService.updateCocktailImage(99L, file))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("99");
    }

    @Test
    @DisplayName("getCocktailsByCategorie - retrieves cocktails by category")
    void shouldGetCocktailsByCategorie() {
        when(cocktailRepository.findByCategorie(CocktailCategorie.ALCOOLISE)).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.getCocktailsByCategorie(CocktailCategorie.ALCOOLISE);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCategorie()).isEqualTo(CocktailCategorie.ALCOOLISE);
    }

    @Test
    @DisplayName("getCocktailsDisponibles - retrieves available cocktails")
    void shouldGetCocktailsDisponibles() {
        when(cocktailRepository.findByDisponible(true)).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.getCocktailsDisponibles();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).isDisponible()).isTrue();
    }

    @Test
    @DisplayName("getCocktailsSaisonniers - retrieves seasonal cocktails")
    void shouldGetCocktailsSaisonniers() {
        cocktail.setSaisonnier(true);
        when(cocktailRepository.findBySaisonnier(true)).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.getCocktailsSaisonniers();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).isSaisonnier()).isTrue();
    }

    @Test
    @DisplayName("getCocktailsSaisonniersActuels - retrieves currently active seasonal cocktails")
    void shouldGetCocktailsSaisonniersActuels() {
        cocktail.setSaisonnier(true);
        when(timeService.now()).thenReturn(LocalDateTime.of(2026, Month.JULY, 15, 12, 0));
        when(cocktailRepository.findBySaisonnierAndDateDebutSaisonBeforeAndDateFinSaisonAfter(
            eq(true), any(LocalDateTime.class), any(LocalDateTime.class)
        )).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.getCocktailsSaisonniersActuels();

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("searchCocktails - finds cocktails by name containing substring")
    void shouldSearchCocktails() {
        when(cocktailRepository.findByNomContainingIgnoreCase("moj")).thenReturn(List.of(cocktail));

        List<Cocktail> result = cocktailService.searchCocktails("moj");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNom()).isEqualTo("Mojito");
    }

    @Test
    @DisplayName("toggleDisponibilite - toggles availability flag")
    void shouldToggleDisponibilite() {
        cocktail.setDisponible(true);
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> i.getArgument(0));

        cocktailService.toggleDisponibilite(cocktail);

        assertThat(cocktail.isDisponible()).isFalse();

        cocktailService.toggleDisponibilite(cocktail);

        assertThat(cocktail.isDisponible()).isTrue();
    }

    @Test
    @DisplayName("deleteCocktail - deletes cocktail by ID")
    void shouldDeleteCocktail() {
        cocktailService.deleteCocktail(1L);

        verify(cocktailRepository).deleteById(1L);
    }

    @Test
    @DisplayName("createCocktailFromRequest(DTO) - creates and returns cocktail with glassware, steps, and variantes")
    void shouldCreateCocktailFromDTO() {
        Glassware glass = new Glassware();
        glass.setId(5L);
        glass.setNom("Verre Tumbler");

        Ingredient rum = new Ingredient();
        rum.setId(10L);
        rum.setNom("White Rum");

        RecipeStepTemplate template = new RecipeStepTemplate();
        template.setId(20L);
        template.setName("Shake");
        template.setActionType(RecipeStepActionType.SHAKE);

        when(glasswareRepository.findById(5L)).thenReturn(Optional.of(glass));
        when(ingredientRepository.findById(10L)).thenReturn(Optional.of(rum));
        when(templateRepository.findById(20L)).thenReturn(Optional.of(template));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> {
            Cocktail c = i.getArgument(0);
            c.setId(100L);
            return c;
        });

        CocktailRecipeStepRequestDTO stepIng = new CocktailRecipeStepRequestDTO(
            1, RecipeStepType.INGREDIENT, 10L, new BigDecimal("5.0"), "cl", null, null, null, null
        );
        CocktailRecipeStepRequestDTO stepTpl = new CocktailRecipeStepRequestDTO(
            2, RecipeStepType.ACTION_TEMPLATE, null, null, null, 20L, null, null, 15
        );
        CocktailVarianteRequestDTO varDto = new CocktailVarianteRequestDTO(
            null, "Sans Alcool", "Virgin version", BigDecimal.ZERO, BigDecimal.ONE, true, "Use alcohol-free spirit"
        );

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito Premium", "Refined mojito", new BigDecimal("12.00"), CocktailCategorie.ALCOOLISE,
            true, false, null, null, null, null, null, null,
            List.of(stepIng, stepTpl), 5L, List.of(varDto)
        );

        CocktailResponseDTO response = cocktailService.createCocktailFromRequest(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.nom()).isEqualTo("Mojito Premium");
    }

    @Test
    @DisplayName("updateCocktailFromRequest(id, DTO) - updates cocktail properties, glassware, syncs ingredients and variantes")
    void shouldUpdateCocktailFromDTO() {
        Glassware glass = new Glassware();
        glass.setId(5L);
        glass.setNom("Coupe Martini");

        Ingredient lime = new Ingredient();
        lime.setId(11L);
        lime.setNom("Lime Juice");

        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));
        when(glasswareRepository.findById(5L)).thenReturn(Optional.of(glass));
        when(ingredientRepository.findById(11L)).thenReturn(Optional.of(lime));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> i.getArgument(0));

        CocktailRecipeStepRequestDTO stepIng = new CocktailRecipeStepRequestDTO(
            1, RecipeStepType.INGREDIENT, 11L, new BigDecimal("3.0"), "cl", null, null, null, null
        );
        CocktailVarianteRequestDTO varDto = new CocktailVarianteRequestDTO(
            1L, "Spicy", "With chili rim", new BigDecimal("1.50"), BigDecimal.ONE, true, null
        );

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito Updated", "Updated desc", new BigDecimal("10.00"), CocktailCategorie.ALCOOLISE,
            true, false, null, null, null, null, null, "https://example.com/mojito.jpg",
            List.of(stepIng), 5L, List.of(varDto)
        );

        CocktailResponseDTO response = cocktailService.updateCocktailFromRequest(1L, request);

        assertThat(response).isNotNull();
        assertThat(response.nom()).isEqualTo("Mojito Updated");
        assertThat(response.imageUrl()).isEqualTo("https://example.com/mojito.jpg");
    }

    @Test
    @DisplayName("updateCocktailFromRequest(id, DTO) - clears glassware when glasswareId is null and throws when not found")
    void shouldHandleNullGlasswareAndNotFound() {
        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> i.getArgument(0));

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito No Glass", null, new BigDecimal("10.00"), CocktailCategorie.ALCOOLISE,
            true, false, null, null, null, null, null, null, null, null, null
        );

        CocktailResponseDTO response = cocktailService.updateCocktailFromRequest(1L, request);
        assertThat(response).isNotNull();
        assertThat(cocktail.getGlassware()).isNull();

        when(cocktailRepository.findById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> cocktailService.updateCocktailFromRequest(999L, request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("999");
    }

    @Test
    @DisplayName("createCocktailFromRequest - correctly maps customized variant ingredients and instructions")
    void shouldCreateCocktailWithCustomizedVariantIngredients() {
        Ingredient rum = new Ingredient();
        rum.setId(10L);
        rum.setNom("White Rum");

        Ingredient mint = new Ingredient();
        mint.setId(12L);
        mint.setNom("Fresh Mint");

        when(ingredientRepository.findById(10L)).thenReturn(Optional.of(rum));
        when(ingredientRepository.findById(12L)).thenReturn(Optional.of(mint));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> {
            Cocktail c = i.getArgument(0);
            c.setId(101L);
            return c;
        });

        CocktailVarianteIngredientRequestDTO varIng1 = new CocktailVarianteIngredientRequestDTO(
            10L, new BigDecimal("6.0"), "cl", "Extra rum"
        );
        CocktailVarianteIngredientRequestDTO varIng2 = new CocktailVarianteIngredientRequestDTO(
            12L, new BigDecimal("8.0"), "feuilles", "Extra mint leaves"
        );

        CocktailVarianteRequestDTO customVar = new CocktailVarianteRequestDTO(
            null, "Double Rum Mint", "Extra strong and fresh", new BigDecimal("3.00"),
            new BigDecimal("1.5"), true, "Shake intensely with crushed ice", List.of(varIng1, varIng2)
        );

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito Custom", "Custom description", new BigDecimal("10.00"), CocktailCategorie.ALCOOLISE,
            true, false, null, null, null, null, null, null,
            null, null, List.of(customVar)
        );

        CocktailResponseDTO response = cocktailService.createCocktailFromRequest(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(101L);
        assertThat(response.variantes()).hasSize(1);
        assertThat(response.variantes().get(0).nom()).isEqualTo("Double Rum Mint");
        assertThat(response.variantes().get(0).ingredients()).hasSize(2);
        assertThat(response.variantes().get(0).ingredients().get(0).ingredientNom()).isEqualTo("White Rum");
        assertThat(response.variantes().get(0).instructions()).isEqualTo("Shake intensely with crushed ice");
    }

    @Test
    @DisplayName("updateCocktailFromRequest - deletes removed variants cleanly and prevents duplication accumulation")
    void shouldUpdateCocktailDeletingVariantsWithoutDuplication() {
        CocktailVariante oldVar1 = new CocktailVariante();
        oldVar1.setId(101L);
        oldVar1.setNom("Old Variant 1");
        oldVar1.setCocktail(cocktail);

        CocktailVariante oldVar2 = new CocktailVariante();
        oldVar2.setId(102L);
        oldVar2.setNom("Old Variant 2");
        oldVar2.setCocktail(cocktail);

        cocktail.setVariantes(new ArrayList<>(List.of(oldVar1, oldVar2)));

        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> i.getArgument(0));

        // Submit with only 1 new variant (deleting oldVar1 and oldVar2, replacing with 1 new)
        CocktailVarianteRequestDTO newVar = new CocktailVarianteRequestDTO(
            1L, "New Single Variant", "Kept variant", new BigDecimal("1.00"),
            BigDecimal.ONE, true, null, List.of()
        );

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito Single Variant", null, new BigDecimal("10.00"), CocktailCategorie.ALCOOLISE,
            true, false, null, null, null, null, null, null,
            null, null, List.of(newVar)
        );

        CocktailResponseDTO response = cocktailService.updateCocktailFromRequest(1L, request);

        assertThat(response).isNotNull();
        assertThat(cocktail.getVariantes()).hasSize(1);
        assertThat(cocktail.getVariantes().get(0).getNom()).isEqualTo("New Single Variant");
    }

    @Test
    @DisplayName("updateCocktailFromRequest - correctly serializes and preserves mixology recipe steps on variants")
    void shouldPersistVariantRecipeStepsCorrectly() {
        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> i.getArgument(0));

        CocktailRecipeStepRequestDTO step1 = new CocktailRecipeStepRequestDTO(
            1, RecipeStepType.CUSTOM_TEXT, null, null, null, null, "Shaker vigoureusement 15s", "Avec beaucoup de glace", 15
        );
        CocktailRecipeStepRequestDTO step2 = new CocktailRecipeStepRequestDTO(
            2, RecipeStepType.CUSTOM_TEXT, null, null, null, null, "Double filtrer dans verre tumbler", "Garnir de menthe", 5
        );

        CocktailVarianteRequestDTO variantWithSteps = new CocktailVarianteRequestDTO(
            null, 1L, "Double Shake Variant", "Variant with detailed mixology steps",
            new BigDecimal("2.50"), BigDecimal.valueOf(2), true, "Shake 15s then double strain",
            List.of(), List.of(step1, step2)
        );

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito Mixology", null, new BigDecimal("12.00"), CocktailCategorie.ALCOOLISE,
            true, false, null, null, null, null, null, null,
            null, null, List.of(variantWithSteps)
        );

        CocktailResponseDTO response = cocktailService.updateCocktailFromRequest(1L, request);

        assertThat(response).isNotNull();
        assertThat(response.variantes()).hasSize(1);
        CocktailVarianteResponseDTO respVar = response.variantes().get(0);
        assertThat(respVar.nom()).isEqualTo("Double Shake Variant");
        assertThat(respVar.recipeSteps()).hasSize(2);
        assertThat(respVar.recipeSteps().get(0).actionTitle()).isEqualTo("Shaker vigoureusement 15s");
        assertThat(respVar.recipeSteps().get(1).actionTitle()).isEqualTo("Double filtrer dans verre tumbler");
    }

    @Test
    @DisplayName("updateCocktailFromRequest - updates existing variant in-place when IDs match")
    void shouldUpdateExistingVariantInPlace() {
        CocktailVariante existingVar = new CocktailVariante();
        existingVar.setId(200L);
        existingVar.setNom("Initial Variant");
        existingVar.setPrixSupplement(new BigDecimal("1.00"));
        existingVar.setCocktail(cocktail);
        cocktail.setVariantes(new ArrayList<>(List.of(existingVar)));

        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> i.getArgument(0));

        CocktailVarianteRequestDTO updatedVarDto = new CocktailVarianteRequestDTO(
            200L, 1L, "Renamed Variant", "Updated description",
            new BigDecimal("3.00"), BigDecimal.valueOf(1.5), false, "New instructions",
            List.of(), null
        );

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito In-Place", null, new BigDecimal("12.00"), CocktailCategorie.ALCOOLISE,
            true, false, null, null, null, null, null, null,
            null, null, List.of(updatedVarDto)
        );

        CocktailResponseDTO response = cocktailService.updateCocktailFromRequest(1L, request);

        assertThat(response).isNotNull();
        assertThat(cocktail.getVariantes()).hasSize(1);
        CocktailVariante v = cocktail.getVariantes().get(0);
        assertThat(v.getId()).isEqualTo(200L);
        assertThat(v.getNom()).isEqualTo("Renamed Variant");
        assertThat(v.getPrixSupplement()).isEqualByComparingTo(new BigDecimal("3.00"));
        assertThat(v.isDisponible()).isFalse();
    }

    @Test
    @DisplayName("createCocktailFromRequest - maps recipe steps with template and ingredient lookups")
    void shouldMapRecipeStepsWithTemplateAndIngredientLookups() {
        Ingredient rum = new Ingredient();
        rum.setId(10L);
        rum.setNom("White Rum");

        RecipeStepTemplate template = new RecipeStepTemplate();
        template.setId(50L);
        template.setName("Shake");
        template.setActionType(RecipeStepActionType.SHAKE);

        when(ingredientRepository.findById(10L)).thenReturn(Optional.of(rum));
        when(templateRepository.findById(50L)).thenReturn(Optional.of(template));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> {
            Cocktail c = i.getArgument(0);
            c.setId(105L);
            return c;
        });

        CocktailRecipeStepRequestDTO stepIng = new CocktailRecipeStepRequestDTO(
            1, RecipeStepType.INGREDIENT, 10L, new BigDecimal("5.0"), "cl", null, null, null, null
        );
        CocktailRecipeStepRequestDTO stepTpl = new CocktailRecipeStepRequestDTO(
            2, RecipeStepType.ACTION_TEMPLATE, null, null, null, 50L, null, null, 15
        );

        CocktailVarianteRequestDTO varWithSteps = new CocktailVarianteRequestDTO(
            null, null, "Custom Steps Variant", null, BigDecimal.ONE, BigDecimal.ONE, true, null,
            List.of(), List.of(stepIng, stepTpl)
        );

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito With Complex Variant Steps", null, new BigDecimal("10.00"), CocktailCategorie.ALCOOLISE,
            true, false, null, null, null, null, null, null,
            List.of(stepIng), null, List.of(varWithSteps)
        );

        CocktailResponseDTO response = cocktailService.createCocktailFromRequest(request);

        assertThat(response).isNotNull();
        assertThat(response.variantes()).hasSize(1);
        CocktailVarianteResponseDTO varResp = response.variantes().get(0);
        assertThat(varResp.recipeSteps()).hasSize(2);
        assertThat(varResp.recipeSteps().get(0).ingredientName()).isEqualTo("White Rum");
        assertThat(varResp.recipeSteps().get(1).template()).isNotNull();
        assertThat(varResp.recipeSteps().get(1).template().name()).isEqualTo("Shake");
    }

    @Test
    @DisplayName("createCocktailFromRequest - maps explicit variant ingredients")
    void shouldMapExplicitVariantIngredientsOnCreate() {
        Ingredient mint = new Ingredient();
        mint.setId(20L);
        mint.setNom("Fresh Mint");

        when(ingredientRepository.findById(20L)).thenReturn(Optional.of(mint));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> {
            Cocktail c = i.getArgument(0);
            c.setId(106L);
            return c;
        });

        CocktailVarianteIngredientRequestDTO varIngDto = new CocktailVarianteIngredientRequestDTO(
            20L, new BigDecimal("8"), "leaves", "Extra fresh"
        );

        CocktailVarianteRequestDTO varWithIngs = new CocktailVarianteRequestDTO(
            null, null, "Mint Overload", null, BigDecimal.ONE, BigDecimal.ONE, true, null,
            List.of(varIngDto), null
        );

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito Mint", null, new BigDecimal("10.00"), CocktailCategorie.ALCOOLISE,
            true, false, null, null, null, null, null, null,
            null, null, List.of(varWithIngs)
        );

        CocktailResponseDTO response = cocktailService.createCocktailFromRequest(request);

        assertThat(response).isNotNull();
        assertThat(response.variantes()).hasSize(1);
        assertThat(response.variantes().get(0).ingredients()).hasSize(1);
        assertThat(response.variantes().get(0).ingredients().get(0).ingredientNom()).isEqualTo("Fresh Mint");
    }

    @Test
    @DisplayName("updateCocktailFromRequest - updates variant with explicit ingredients and extracted ingredients from steps")
    void shouldUpdateVariantWithExplicitAndExtractedIngredients() {
        Ingredient lime = new Ingredient();
        lime.setId(30L);
        lime.setNom("Lime Juice");

        CocktailVariante existingVar = new CocktailVariante();
        existingVar.setId(300L);
        existingVar.setNom("Variant To Update");
        existingVar.setCocktail(cocktail);
        cocktail.setVariantes(new ArrayList<>(List.of(existingVar)));

        when(cocktailRepository.findById(1L)).thenReturn(Optional.of(cocktail));
        when(ingredientRepository.findById(30L)).thenReturn(Optional.of(lime));
        when(cocktailRepository.save(any(Cocktail.class))).thenAnswer(i -> i.getArgument(0));

        CocktailVarianteIngredientRequestDTO varIngDto = new CocktailVarianteIngredientRequestDTO(
            30L, new BigDecimal("3.0"), "cl", null
        );

        CocktailVarianteRequestDTO updatedVarWithIngs = new CocktailVarianteRequestDTO(
            300L, 1L, "Variant With Ings", "Desc",
            BigDecimal.ZERO, BigDecimal.ONE, true, "Notes",
            List.of(varIngDto), null
        );

        CocktailRequestDTO request = new CocktailRequestDTO(
            "Mojito In-Place Lime", null, new BigDecimal("12.00"), CocktailCategorie.ALCOOLISE,
            true, false, null, null, null, null, null, null,
            null, null, List.of(updatedVarWithIngs)
        );

        CocktailResponseDTO response = cocktailService.updateCocktailFromRequest(1L, request);

        assertThat(response).isNotNull();
        assertThat(cocktail.getVariantes()).hasSize(1);
        assertThat(cocktail.getVariantes().get(0).getIngredients()).hasSize(1);
        assertThat(cocktail.getVariantes().get(0).getIngredients().get(0).getIngredient().getNom()).isEqualTo("Lime Juice");
    }
}

