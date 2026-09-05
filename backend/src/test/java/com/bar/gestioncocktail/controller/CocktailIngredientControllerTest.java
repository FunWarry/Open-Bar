package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailIngredientRequestDTO;
import com.bar.gestioncocktail.dto.CocktailIngredientResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailIngredient;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.service.CocktailIngredientService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CocktailIngredientControllerTest {

    @Mock
    private CocktailIngredientService service;

    @InjectMocks
    private CocktailIngredientController controller;

    private CocktailIngredient ci;

    @BeforeEach
    void setUp() {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(1L);

        Ingredient ingredient = new Ingredient();
        ingredient.setId(2L);

        ci = new CocktailIngredient();
        ci.setId(5L);
        ci.setCocktail(cocktail);
        ci.setIngredient(ingredient);
        ci.setQuantite(new BigDecimal("4.00"));
    }

    @Test
    @DisplayName("createCocktailIngredient - creates link and returns DTO")
    void create_success() {
        CocktailIngredientRequestDTO request = new CocktailIngredientRequestDTO(1L, 2L, new BigDecimal("4.00"), null);
        when(service.createCocktailIngredient(any(CocktailIngredient.class))).thenReturn(ci);

        ResponseEntity<CocktailIngredientResponseDTO> response = controller.createCocktailIngredient(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("deleteCocktailIngredient - deletes by id")
    void delete_success() {
        ResponseEntity<Void> response = controller.deleteCocktailIngredient(5L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(service).deleteCocktailIngredient(5L);
    }

    @Test
    @DisplayName("getIngredientsByCocktail and getCocktailsByIngredient")
    void queries() {
        when(service.getIngredientsByCocktail(any(Cocktail.class))).thenReturn(List.of(ci));
        when(service.getCocktailsByIngredient(any(Ingredient.class))).thenReturn(List.of(ci));

        ResponseEntity<List<CocktailIngredientResponseDTO>> resp1 = controller.getIngredientsByCocktail(1L);
        ResponseEntity<List<CocktailIngredientResponseDTO>> resp2 = controller.getCocktailsByIngredient(2L);

        assertThat(resp1.getBody()).hasSize(1);
        assertThat(resp2.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("updateQuantite - updates quantity when found, 404 otherwise")
    void updateQuantite_foundAndNotFound() {
        when(service.getCocktailIngredientById(5L)).thenReturn(Optional.of(ci));
        when(service.getCocktailIngredientById(99L)).thenReturn(Optional.empty());

        ResponseEntity<CocktailIngredientResponseDTO> found = controller.updateQuantite(5L, new BigDecimal("6.00"));
        ResponseEntity<CocktailIngredientResponseDTO> notFound = controller.updateQuantite(99L, new BigDecimal("6.00"));

        assertThat(found.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(notFound.getStatusCode().value()).isEqualTo(404);
        verify(service).updateQuantite(ci, new BigDecimal("6.00"));
    }

    @Test
    @DisplayName("deleteCocktailIngredient - deletes by cocktail and ingredient IDs")
    void deleteByBothIds_success() {
        ResponseEntity<Void> response = controller.deleteCocktailIngredient(1L, 2L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(service).deleteCocktailIngredient(any(Cocktail.class), any(Ingredient.class));
    }
}
