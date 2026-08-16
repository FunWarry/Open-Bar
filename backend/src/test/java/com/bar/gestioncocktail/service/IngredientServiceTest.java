package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Ingredient;
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
    NotificationService notificationService;

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
}
