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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CocktailIngredientControllerTest {

    @Mock
    CocktailIngredientService service;

    @InjectMocks
    CocktailIngredientController controller;

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
    @DisplayName("getIngredientsByCocktail - returns list of ingredients for cocktail")
    void getByCocktail_success() {
        when(service.getIngredientsByCocktail(any(Cocktail.class))).thenReturn(List.of(ci));

        ResponseEntity<List<CocktailIngredientResponseDTO>> response = controller.getIngredientsByCocktail(1L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
    }
}
