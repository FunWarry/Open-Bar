package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailVarianteRequestDTO;
import com.bar.gestioncocktail.dto.CocktailVarianteResponseDTO;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailVariante;
import com.bar.gestioncocktail.service.CocktailVarianteService;
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
class CocktailVarianteControllerTest {

    @Mock
    CocktailVarianteService cocktailVarianteService;

    @InjectMocks
    CocktailVarianteController controller;

    private CocktailVariante variante;

    @BeforeEach
    void setUp() {
        Cocktail cocktail = new Cocktail();
        cocktail.setId(1L);

        variante = new CocktailVariante();
        variante.setId(10L);
        variante.setCocktail(cocktail);
        variante.setNom("Sans Alcool");
        variante.setPrixSupplement(new BigDecimal("0.00"));
    }

    @Test
    @DisplayName("getVariantesByCocktail - returns list of DTOs for cocktail")
    void getVariantesByCocktail_returnsList() {
        when(cocktailVarianteService.getVariantesByCocktail(any(Cocktail.class))).thenReturn(List.of(variante));

        ResponseEntity<List<CocktailVarianteResponseDTO>> response = controller.getVariantesByCocktail(1L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("getCocktailVarianteById - returns DTO if found")
    void getById_found() {
        when(cocktailVarianteService.getCocktailVarianteById(10L)).thenReturn(Optional.of(variante));

        ResponseEntity<CocktailVarianteResponseDTO> response = controller.getCocktailVarianteById(10L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("createCocktailVariante - creates variant and returns DTO")
    void create_success() {
        CocktailVarianteRequestDTO request = new CocktailVarianteRequestDTO(1L, "XL", null, new BigDecimal("2.00"), null, true, null);
        when(cocktailVarianteService.createCocktailVariante(any(CocktailVariante.class))).thenReturn(variante);

        ResponseEntity<CocktailVarianteResponseDTO> response = controller.createCocktailVariante(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("deleteCocktailVariante - deletes variant by id")
    void delete_success() {
        ResponseEntity<Void> response = controller.deleteCocktailVariante(10L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(cocktailVarianteService).deleteCocktailVariante(10L);
    }
}
