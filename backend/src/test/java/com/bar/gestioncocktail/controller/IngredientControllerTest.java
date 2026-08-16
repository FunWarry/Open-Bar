package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.IngredientRequestDTO;
import com.bar.gestioncocktail.dto.IngredientResponseDTO;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.service.IngredientService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;

import com.bar.gestioncocktail.exception.BusinessException;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IngredientControllerTest {

    @Mock
    private IngredientService ingredientService;

    @InjectMocks
    private IngredientController ingredientController;

    private Ingredient ingredient;

    @BeforeEach
    void setUp() {
        ingredient = new Ingredient();
        ingredient.setId(1L);
        ingredient.setNom("Rhum");
        ingredient.setUniteMesure("cl");
        ingredient.setQuantiteStock(new BigDecimal("500.00"));
        ingredient.setSeuilAlerte(new BigDecimal("50.00"));
    }

    @Test
    @DisplayName("getAllIngredients - calls service and returns list of DTOs")
    void getAllIngredients_success() {
        when(ingredientService.getAllIngredients()).thenReturn(java.util.List.of(ingredient));

        ResponseEntity<java.util.List<IngredientResponseDTO>> response = ingredientController.getAllIngredients();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).nom()).isEqualTo("Rhum");
    }

    @Test
    @DisplayName("createIngredient - calls service and returns DTO")
    void createIngredient_success() {
        IngredientRequestDTO request = new IngredientRequestDTO("Rhum", "cl", new BigDecimal("500.00"), new BigDecimal("50.00"), null, null, null, null, null);
        when(ingredientService.createIngredient(any(Ingredient.class))).thenReturn(ingredient);

        ResponseEntity<IngredientResponseDTO> response = ingredientController.createIngredient(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().nom()).isEqualTo("Rhum");
    }

    @Test
    @DisplayName("updateIngredient - updates ingredient and returns DTO")
    void updateIngredient_success() {
        IngredientRequestDTO request = new IngredientRequestDTO("Rhum", "cl", new BigDecimal("500.00"), new BigDecimal("50.00"), null, null, null, null, null);
        when(ingredientService.updateIngredient(eq(1L), any(Ingredient.class))).thenReturn(ingredient);

        ResponseEntity<IngredientResponseDTO> response = ingredientController.updateIngredient(1L, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("deleteIngredient - deletes ingredient by id")
    void deleteIngredient_success() {
        ResponseEntity<Void> response = ingredientController.deleteIngredient(1L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(ingredientService).deleteIngredient(1L);
    }

    @Test
    @DisplayName("updateStock - with query param updates stock")
    void updateStock_withRequestParam_success() {
        when(ingredientService.getIngredientById(1L)).thenReturn(Optional.of(ingredient));

        ResponseEntity<IngredientResponseDTO> response = ingredientController.updateStock(1L, new BigDecimal("600.00"), null);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(ingredientService).updateStock(ingredient, new BigDecimal("600.00"));
    }

    @Test
    @DisplayName("updateStock - with JSON body updates stock")
    void updateStock_withRequestBody_success() {
        when(ingredientService.getIngredientById(1L)).thenReturn(Optional.of(ingredient));

        ResponseEntity<IngredientResponseDTO> response = ingredientController.updateStock(1L, null, Map.of("quantite", 600));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(ingredientService).updateStock(ingredient, new BigDecimal("600"));
    }

    @Test
    @DisplayName("updateStock - missing quantity throws BusinessException")
    void updateStock_missingQuantity_throwsException() {
        assertThatThrownBy(() -> ingredientController.updateStock(1L, null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Quantity is required.");
    }

    @Test
    @DisplayName("updateStock - ingredient not found returns 404")
    void updateStock_notFound_returns404() {
        when(ingredientService.getIngredientById(99L)).thenReturn(Optional.empty());

        ResponseEntity<IngredientResponseDTO> response = ingredientController.updateStock(99L, new BigDecimal("10"), null);

        assertThat(response.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("definirSeuilAlerte - with query param updates threshold")
    void definirSeuilAlerte_withRequestParam_success() {
        when(ingredientService.getIngredientById(1L)).thenReturn(Optional.of(ingredient));

        ResponseEntity<IngredientResponseDTO> response = ingredientController.definirSeuilAlerte(1L, new BigDecimal("20.00"), null);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(ingredientService).definirSeuilAlerte(ingredient, new BigDecimal("20.00"));
    }

    @Test
    @DisplayName("definirSeuilAlerte - with JSON body updates threshold")
    void definirSeuilAlerte_withRequestBody_success() {
        when(ingredientService.getIngredientById(1L)).thenReturn(Optional.of(ingredient));

        ResponseEntity<IngredientResponseDTO> response = ingredientController.definirSeuilAlerte(1L, null, Map.of("seuil", 20));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(ingredientService).definirSeuilAlerte(ingredient, new BigDecimal("20"));
    }

    @Test
    @DisplayName("definirSeuilAlerte - missing threshold throws BusinessException")
    void definirSeuilAlerte_missingSeuil_throwsException() {
        assertThatThrownBy(() -> ingredientController.definirSeuilAlerte(1L, null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Threshold is required.");
    }

    @Test
    @DisplayName("definirSeuilAlerte - ingredient not found returns 404")
    void definirSeuilAlerte_notFound_returns404() {
        when(ingredientService.getIngredientById(99L)).thenReturn(Optional.empty());

        ResponseEntity<IngredientResponseDTO> response = ingredientController.definirSeuilAlerte(99L, new BigDecimal("10"), null);

        assertThat(response.getStatusCode().value()).isEqualTo(404);
    }
}
