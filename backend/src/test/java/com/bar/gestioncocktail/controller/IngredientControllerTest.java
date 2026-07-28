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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IngredientControllerTest {

    @Mock
    IngredientService ingredientService;

    @InjectMocks
    IngredientController ingredientController;

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
        when(ingredientService.updateIngredient(any(Ingredient.class))).thenReturn(ingredient);

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
}
