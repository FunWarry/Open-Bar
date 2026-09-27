package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.ConfectionSourceRequest;
import com.bar.gestioncocktail.model.Allergen;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.repository.IngredientConfectionSourceRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.mockito.Spy;

@ExtendWith(MockitoExtension.class)
class IngredientServiceTest {

    @Mock
    IngredientRepository ingredientRepository;

    @Mock
    IngredientConfectionSourceRepository confectionSourceRepository;

    @Mock
    org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Spy
    TimeService timeService = new TimeService(null);

    @InjectMocks
    IngredientService ingredientService;


    private Ingredient ingredient;

    @BeforeEach
    void setUp() {
        ingredient = new Ingredient();
        ingredient.setId(1L);
        ingredient.setNom("Rhum");
        ingredient.setUniteMesure("cl");
        ingredient.setQuantiteStock(new BigDecimal("100.00"));
        ingredient.setSeuilAlerte(new BigDecimal("20.00"));
    }

    @Test
    void getIngredientById_existant_retourne() {
        when(ingredientRepository.findById(1L)).thenReturn(Optional.of(ingredient));

        Optional<Ingredient> result = ingredientService.getIngredientById(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getNom()).isEqualTo("Rhum");
    }

    @Test
    void getAllIngredients_retourneListe() {
        when(ingredientRepository.findAll()).thenReturn(List.of(ingredient));

        List<Ingredient> result = ingredientService.getAllIngredients();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNom()).isEqualTo("Rhum");
    }

    @Test
    void createIngredient_sauvegarde() {
        Ingredient nouveau = new Ingredient();
        nouveau.setNom("Citron vert");
        nouveau.setUniteMesure("unit");
        nouveau.setQuantiteStock(new BigDecimal("50.00"));
        nouveau.setSeuilAlerte(new BigDecimal("10.00"));

        when(ingredientRepository.save(any(Ingredient.class))).thenReturn(nouveau);

        Ingredient result = ingredientService.createIngredient(nouveau);

        assertThat(result.getNom()).isEqualTo("Citron vert");
        verify(ingredientRepository, times(1)).save(nouveau);
    }

    @Test
    void updateIngredient_success() {
        when(ingredientRepository.findById(1L)).thenReturn(Optional.of(ingredient));
        when(ingredientRepository.save(any(Ingredient.class))).thenReturn(ingredient);

        Ingredient updateData = new Ingredient();
        updateData.setNom("Rhum Vieux");
        updateData.setUniteMesure("cl");
        updateData.setQuantiteStock(new BigDecimal("200.00"));
        updateData.setSeuilAlerte(new BigDecimal("40.00"));

        Ingredient result = ingredientService.updateIngredient(1L, updateData);

        assertThat(result.getNom()).isEqualTo("Rhum Vieux");
        verify(ingredientRepository).save(any(Ingredient.class));
    }

    @Test
    void updateStock_incrementeStock() {
        BigDecimal nouvelleQuantite = new BigDecimal("150.00");
        when(ingredientRepository.save(any(Ingredient.class))).thenReturn(ingredient);

        ingredientService.updateStock(ingredient, nouvelleQuantite);

        assertThat(ingredient.getQuantiteStock()).isEqualByComparingTo(new BigDecimal("150.00"));
        verify(ingredientRepository, times(1)).save(ingredient);
    }

    @Test
    void updateStock_decrementeStock() {
        BigDecimal nouvelleQuantite = new BigDecimal("30.00");
        when(ingredientRepository.save(any(Ingredient.class))).thenReturn(ingredient);

        ingredientService.updateStock(ingredient, nouvelleQuantite);

        assertThat(ingredient.getQuantiteStock()).isEqualByComparingTo(new BigDecimal("30.00"));
        verify(ingredientRepository, times(1)).save(ingredient);
    }

    @Test
    void getIngredientsSousSeuil_filtreSurSeuil() {
        Ingredient sousSeuil = new Ingredient();
        sousSeuil.setId(2L);
        sousSeuil.setNom("Menthe");
        sousSeuil.setQuantiteStock(BigDecimal.ZERO);
        sousSeuil.setSeuilAlerte(new BigDecimal("5.00"));

        when(ingredientRepository.findByQuantiteStockLessThanEqual(BigDecimal.ZERO))
                .thenReturn(List.of(sousSeuil));

        List<Ingredient> result = ingredientService.getIngredientsBySeuilAlerte();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNom()).isEqualTo("Menthe");
        verify(ingredientRepository).findByQuantiteStockLessThanEqual(BigDecimal.ZERO);
    }

    @Test
    void updateStock_belowThreshold_publishesStockAlertEvent() {
        ingredient.setQuantiteStock(new BigDecimal("50.00"));
        ingredient.setSeuilAlerte(new BigDecimal("20.00"));
        when(ingredientRepository.save(any(Ingredient.class))).thenReturn(ingredient);

        ingredientService.updateStock(ingredient, new BigDecimal("15.00"));

        verify(eventPublisher).publishEvent(any(com.bar.gestioncocktail.event.StockAlertEvent.class));
    }

    @Test
    void createIngredientWithSources_synchronizesAllergensAndForcesNonVegan() {
        Ingredient crafted = new Ingredient();
        crafted.setId(10L);
        crafted.setNom("Sirop Lait-Amande");
        crafted.setIsVegan(true);
        crafted.setAllergens(new java.util.HashSet<>());

        Ingredient sourceMilk = new Ingredient();
        sourceMilk.setId(2L);
        sourceMilk.setNom("Lait");
        sourceMilk.setIsVegan(false);
        sourceMilk.setAllergens(new java.util.HashSet<>(java.util.List.of(Allergen.LAIT)));

        when(ingredientRepository.findById(2L)).thenReturn(Optional.of(sourceMilk));
        when(ingredientRepository.save(any(Ingredient.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(ingredientRepository.findById(10L)).thenReturn(Optional.of(crafted));

        ConfectionSourceRequest req = new ConfectionSourceRequest(2L, new BigDecimal("2.5"), "cl", "Test source");
        Ingredient result = ingredientService.createIngredientWithSources(crafted, java.util.List.of(req));

        assertThat(result.getAllergens()).contains(Allergen.LAIT);
        assertThat(result.getIsVegan()).isFalse();
        verify(confectionSourceRepository).save(any());
    }

    @Test
    void createIngredientWithSources_withNullOrEmptyRequests_persistsSafely() {
        Ingredient nouveau = new Ingredient();
        nouveau.setId(20L);
        nouveau.setNom("Sirop Simple");
        when(ingredientRepository.save(any(Ingredient.class))).thenReturn(nouveau);
        when(ingredientRepository.findById(20L)).thenReturn(Optional.of(nouveau));

        Ingredient resultNull = ingredientService.createIngredientWithSources(nouveau, null);
        assertThat(resultNull).isNotNull();

        Ingredient resultEmpty = ingredientService.createIngredientWithSources(nouveau, List.of());
        assertThat(resultEmpty).isNotNull();
        verify(confectionSourceRepository, never()).save(any());
    }

    @Test
    void updateIngredientWithSources_updatesAndReplacesConfectionSources() {
        Ingredient existing = new Ingredient();
        existing.setId(30L);
        existing.setNom("Ancien Sirop");
        existing.setIsCrafted(true);

        when(ingredientRepository.findById(30L)).thenReturn(Optional.of(existing));
        when(ingredientRepository.save(any(Ingredient.class))).thenAnswer(inv -> inv.getArgument(0));

        Ingredient eggWhite = new Ingredient();
        eggWhite.setId(4L);
        eggWhite.setNom("Blanc d oeuf");
        eggWhite.setAllergens(new java.util.HashSet<>(List.of(Allergen.OEUF)));
        eggWhite.setIsVegan(true); // even if erroneously marked vegan, egg allergen forces isVegan false
        when(ingredientRepository.findById(4L)).thenReturn(Optional.of(eggWhite));

        Ingredient updateData = new Ingredient();
        updateData.setNom("Mousse Albumine");
        updateData.setIsVegan(true);

        ConfectionSourceRequest req = new ConfectionSourceRequest(4L, new BigDecimal("1.0"), "pièce", "Egg white");
        Ingredient updated = ingredientService.updateIngredientWithSources(30L, updateData, List.of(req));

        assertThat(updated.getNom()).isEqualTo("Mousse Albumine");
        assertThat(updated.getAllergens()).contains(Allergen.OEUF);
        assertThat(updated.getIsVegan()).isFalse();
        verify(confectionSourceRepository).deleteByCraftedIngredientId(30L);
        verify(confectionSourceRepository).save(any());
    }
}
