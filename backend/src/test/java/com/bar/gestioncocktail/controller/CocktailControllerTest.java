package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CocktailRequestDTO;
import com.bar.gestioncocktail.dto.CocktailResponseDTO;
import com.bar.gestioncocktail.dto.SaisonnaliteRequest;
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
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CocktailControllerTest {

    @Mock
    private CocktailService cocktailService;

    @InjectMocks
    private CocktailController cocktailController;

    private Cocktail cocktail;
    private CocktailResponseDTO cocktailDto;

    @BeforeEach
    void setUp() {
        cocktail = new Cocktail();
        cocktail.setId(1L);
        cocktail.setNom("Mojito");
        cocktail.setPrix(new BigDecimal("8.50"));
        cocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        cocktail.setDisponible(true);
        cocktailDto = CocktailResponseDTO.from(cocktail);
    }

    @Test
    @DisplayName("getAllCocktails - retrieves list of all cocktails")
    void getAllCocktails_success() {
        when(cocktailService.getAllCocktails()).thenReturn(List.of(cocktail));

        ResponseEntity<List<CocktailResponseDTO>> response = cocktailController.getAllCocktails();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).nom()).isEqualTo("Mojito");
    }

    @Test
    @DisplayName("createCocktail - calls service and returns DTO")
    void createCocktail_success() {
        CocktailRequestDTO request = new CocktailRequestDTO("Mojito", "Mint", new BigDecimal("8.50"), CocktailCategorie.ALCOOLISE, true, false, null, null, null, null);
        when(cocktailService.createCocktailFromRequest(any(CocktailRequestDTO.class))).thenReturn(cocktailDto);

        ResponseEntity<CocktailResponseDTO> response = cocktailController.createCocktail(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().nom()).isEqualTo("Mojito");
    }

    @Test
    @DisplayName("updateCocktail - updates cocktail and returns DTO")
    void updateCocktail_success() {
        CocktailRequestDTO request = new CocktailRequestDTO("Mojito", "Mint", new BigDecimal("8.50"), CocktailCategorie.ALCOOLISE, true, false, null, null, null, null);
        when(cocktailService.updateCocktailFromRequest(eq(1L), any(CocktailRequestDTO.class))).thenReturn(cocktailDto);

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

    @Test
    @DisplayName("getCocktailById - returns cocktail if found, 404 otherwise")
    void getCocktailById_foundAndNotFound() {
        when(cocktailService.getCocktailById(1L)).thenReturn(Optional.of(cocktail));
        when(cocktailService.getCocktailById(99L)).thenReturn(Optional.empty());

        ResponseEntity<CocktailResponseDTO> found = cocktailController.getCocktailById(1L);
        ResponseEntity<CocktailResponseDTO> notFound = cocktailController.getCocktailById(99L);

        assertThat(found.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(notFound.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("getCocktailsByCategorie, getCocktailsDisponibles, searchCocktails - search and filter endpoints")
    void filter_endpoints() {
        when(cocktailService.getCocktailsByCategorie(CocktailCategorie.ALCOOLISE)).thenReturn(List.of(cocktail));
        when(cocktailService.getCocktailsDisponibles()).thenReturn(List.of(cocktail));
        when(cocktailService.searchCocktails("Mojito")).thenReturn(List.of(cocktail));

        assertThat(cocktailController.getCocktailsByCategorie(CocktailCategorie.ALCOOLISE).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(cocktailController.getCocktailsDisponibles().getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(cocktailController.searchCocktails("Mojito").getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("toggleDisponibilite - toggles availability")
    void toggleDisponibilite_success() {
        when(cocktailService.getCocktailById(1L)).thenReturn(Optional.of(cocktail));
        when(cocktailService.getCocktailById(99L)).thenReturn(Optional.empty());

        ResponseEntity<CocktailResponseDTO> resp1 = cocktailController.toggleDisponibilite(1L);
        ResponseEntity<CocktailResponseDTO> resp2 = cocktailController.toggleDisponibilite(99L);

        assertThat(resp1.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(resp2.getStatusCode().value()).isEqualTo(404);
        verify(cocktailService).toggleDisponibilite(cocktail);
    }

    @Test
    @DisplayName("definirSaisonnalite, updateSaisonnalite, getCocktailsSaisonniers, getCocktailsSaisonniersActuels")
    void seasonality_endpoints() {
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = start.plusMonths(3);
        SaisonnaliteRequest request = new SaisonnaliteRequest(6, 9);

        when(cocktailService.getCocktailById(1L)).thenReturn(Optional.of(cocktail));
        when(cocktailService.updateSaisonnalite(1L, 6, 9)).thenReturn(cocktail);
        when(cocktailService.getCocktailsSaisonniers()).thenReturn(List.of(cocktail));
        when(cocktailService.getCocktailsSaisonniersActuels()).thenReturn(List.of(cocktail));

        assertThat(cocktailController.definirSaisonnalite(1L, start, end).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(cocktailController.updateSaisonnalite(1L, request).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(cocktailController.getCocktailsSaisonniers().getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(cocktailController.getCocktailsSaisonniersActuels().getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("uploadCocktailPhoto - uploads custom photo and returns DTO")
    void uploadCocktailPhoto_success() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", "content".getBytes());
        cocktail.setImageUrl("/uploads/cocktails/cocktail_1_xyz.jpg");
        when(cocktailService.updateCocktailImage(1L, file)).thenReturn(cocktail);

        ResponseEntity<CocktailResponseDTO> response = cocktailController.uploadCocktailPhoto(1L, file);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().imageUrl()).isEqualTo("/uploads/cocktails/cocktail_1_xyz.jpg");
    }
}
