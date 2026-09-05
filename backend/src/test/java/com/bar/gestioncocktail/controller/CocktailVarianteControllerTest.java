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
    private CocktailVarianteService cocktailVarianteService;

    @InjectMocks
    private CocktailVarianteController controller;

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
        variante.setDisponible(true);
    }

    @Test
    @DisplayName("createCocktailVariante and updateCocktailVariante - mutations")
    void mutations() {
        CocktailVarianteRequestDTO request = new CocktailVarianteRequestDTO(1L, "XL", null, new BigDecimal("2.00"), null, true, null);
        when(cocktailVarianteService.createCocktailVariante(any(CocktailVariante.class))).thenReturn(variante);
        when(cocktailVarianteService.updateCocktailVariante(any(CocktailVariante.class))).thenReturn(variante);

        ResponseEntity<CocktailVarianteResponseDTO> createResp = controller.createCocktailVariante(request);
        ResponseEntity<CocktailVarianteResponseDTO> updateResp = controller.updateCocktailVariante(10L, request);

        assertThat(createResp.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(updateResp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("deleteCocktailVariante - deletes variant by id")
    void delete_success() {
        ResponseEntity<Void> response = controller.deleteCocktailVariante(10L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(cocktailVarianteService).deleteCocktailVariante(10L);
    }

    @Test
    @DisplayName("getCocktailVarianteById - returns DTO if found, 404 otherwise")
    void getById_foundAndNotFound() {
        when(cocktailVarianteService.getCocktailVarianteById(10L)).thenReturn(Optional.of(variante));
        when(cocktailVarianteService.getCocktailVarianteById(99L)).thenReturn(Optional.empty());

        ResponseEntity<CocktailVarianteResponseDTO> found = controller.getCocktailVarianteById(10L);
        ResponseEntity<CocktailVarianteResponseDTO> notFound = controller.getCocktailVarianteById(99L);

        assertThat(found.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(notFound.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("getVariantesByCocktail, getVariantesDisponiblesByCocktail, searchVariantes")
    void queries() {
        when(cocktailVarianteService.getVariantesByCocktail(any(Cocktail.class))).thenReturn(List.of(variante));
        when(cocktailVarianteService.getVariantesDisponiblesByCocktail(any(Cocktail.class))).thenReturn(List.of(variante));
        when(cocktailVarianteService.searchVariantes("Sans")).thenReturn(List.of(variante));

        ResponseEntity<List<CocktailVarianteResponseDTO>> resp1 = controller.getVariantesByCocktail(1L);
        ResponseEntity<List<CocktailVarianteResponseDTO>> resp2 = controller.getVariantesDisponiblesByCocktail(1L);
        ResponseEntity<List<CocktailVarianteResponseDTO>> resp3 = controller.searchVariantes("Sans");

        assertThat(resp1.getBody()).hasSize(1);
        assertThat(resp2.getBody()).hasSize(1);
        assertThat(resp3.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("toggleDisponibilite and updatePrixSupplement - state changes")
    void toggleAndPrice() {
        when(cocktailVarianteService.getCocktailVarianteById(10L)).thenReturn(Optional.of(variante));
        when(cocktailVarianteService.getCocktailVarianteById(99L)).thenReturn(Optional.empty());

        ResponseEntity<CocktailVarianteResponseDTO> resp1 = controller.toggleDisponibilite(10L);
        ResponseEntity<CocktailVarianteResponseDTO> resp2 = controller.toggleDisponibilite(99L);

        ResponseEntity<CocktailVarianteResponseDTO> resp3 = controller.updatePrixSupplement(10L, new BigDecimal("1.50"));
        ResponseEntity<CocktailVarianteResponseDTO> resp4 = controller.updatePrixSupplement(99L, new BigDecimal("1.50"));

        assertThat(resp1.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(resp2.getStatusCode().value()).isEqualTo(404);
        assertThat(resp3.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(resp4.getStatusCode().value()).isEqualTo(404);
        verify(cocktailVarianteService).toggleDisponibilite(variante);
        verify(cocktailVarianteService).updatePrixSupplement(variante, new BigDecimal("1.50"));
    }
}
