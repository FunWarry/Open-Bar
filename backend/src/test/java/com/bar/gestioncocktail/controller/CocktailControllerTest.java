package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailRequestDTO;
import com.bar.gestioncocktail.dto.CocktailResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.service.CocktailService;
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
class CocktailControllerTest {

    @Mock
    CocktailService cocktailService;

    @InjectMocks
    CocktailController cocktailController;

    private Cocktail cocktail;

    @BeforeEach
    void setUp() {
        cocktail = new Cocktail();
        cocktail.setId(1L);
        cocktail.setNom("Mojito");
        cocktail.setPrix(new BigDecimal("8.50"));
        cocktail.setCategorie(CocktailCategorie.ALCOOLISE);
    }

    @Test
    @DisplayName("createCocktail - calls service and returns DTO")
    void createCocktail_success() {
        CocktailRequestDTO request = new CocktailRequestDTO("Mojito", "Mint", new BigDecimal("8.50"), CocktailCategorie.ALCOOLISE, true, false, null, null, null, null);
        when(cocktailService.createCocktail(any(Cocktail.class))).thenReturn(cocktail);

        ResponseEntity<CocktailResponseDTO> response = cocktailController.createCocktail(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().nom()).isEqualTo("Mojito");
    }

    @Test
    @DisplayName("updateCocktail - updates cocktail and returns DTO")
    void updateCocktail_success() {
        CocktailRequestDTO request = new CocktailRequestDTO("Mojito", "Mint", new BigDecimal("8.50"), CocktailCategorie.ALCOOLISE, true, false, null, null, null, null);
        when(cocktailService.updateCocktail(any(Cocktail.class))).thenReturn(cocktail);

        ResponseEntity<CocktailResponseDTO> response = cocktailController.updateCocktail(1L, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("deleteCocktail - deletes cocktail by id")
    void deleteCocktail_success() {
        ResponseEntity<Void> response = cocktailController.deleteCocktail(1L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(cocktailService).deleteCocktail(1L);
    }
}
