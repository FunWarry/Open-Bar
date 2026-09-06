package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.StockMovementResponseDTO;
import com.bar.gestioncocktail.dto.StockWasteRequestDTO;
import com.bar.gestioncocktail.dto.StockWasteSummaryDTO;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.StockMovement;
import com.bar.gestioncocktail.model.StockWasteReason;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.service.StockMovementService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link StockMovementController}.
 */
@ExtendWith(MockitoExtension.class)
class StockMovementControllerTest {

    @Mock
    private StockMovementService stockMovementService;

    @Mock
    private Authentication authentication;

    @Mock
    private HttpServletRequest servletRequest;

    @InjectMocks
    private StockMovementController stockMovementController;

    private StockMovement sampleMovement;

    @BeforeEach
    void setUp() {
        Ingredient ing = new Ingredient();
        ing.setId(5L);
        ing.setNom("Vodka Absolut");
        ing.setUniteMesure("bouteille");

        User user = new User();
        user.setId(2L);
        user.setUsername("barman1");

        sampleMovement = new StockMovement();
        sampleMovement.setId(101L);
        sampleMovement.setIngredient(ing);
        sampleMovement.setQuantity(new BigDecimal("1.00"));
        sampleMovement.setUnit("bouteille");
        sampleMovement.setReason(StockWasteReason.CASSE);
        sampleMovement.setReportedBy(user);
        sampleMovement.setCost(new BigDecimal("22.00"));
        sampleMovement.setRecordedAt(LocalDateTime.of(2026, 9, 6, 14, 30));
        sampleMovement.setNotes("Bouteille cassée en préparation");
    }

    @Test
    @DisplayName("recordWaste — nominal: passes authentication context and returns response DTO")
    void recordWaste_nominal_success() {
        when(authentication.getName()).thenReturn("barman1");
        when(servletRequest.getRemoteAddr()).thenReturn("192.168.1.100");

        StockWasteRequestDTO request = new StockWasteRequestDTO(
                5L,
                new BigDecimal("1.00"),
                StockWasteReason.CASSE,
                "Bouteille cassée en préparation"
        );

        when(stockMovementService.recordWaste(request, "barman1", "192.168.1.100"))
                .thenReturn(sampleMovement);

        ResponseEntity<StockMovementResponseDTO> response = stockMovementController.recordWaste(
                request, authentication, servletRequest);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(101L);
        assertThat(response.getBody().ingredientNom()).isEqualTo("Vodka Absolut");
        assertThat(response.getBody().reason()).isEqualTo(StockWasteReason.CASSE);
        assertThat(response.getBody().reportedByUsername()).isEqualTo("barman1");
        assertThat(response.getBody().cost()).isEqualTo(new BigDecimal("22.00"));
    }

    @Test
    @DisplayName("getMovements — without ingredientId: retrieves all movements")
    void getMovements_withoutFilter_retrievesAll() {
        when(stockMovementService.getAllMovements()).thenReturn(List.of(sampleMovement));

        ResponseEntity<List<StockMovementResponseDTO>> response = stockMovementController.getMovements(null);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).id()).isEqualTo(101L);
        verify(stockMovementService).getAllMovements();
    }

    @Test
    @DisplayName("getMovements — with ingredientId: filters by ingredient")
    void getMovements_withFilter_retrievesForIngredient() {
        when(stockMovementService.getMovementsByIngredient(5L)).thenReturn(List.of(sampleMovement));

        ResponseEntity<List<StockMovementResponseDTO>> response = stockMovementController.getMovements(5L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).ingredientId()).isEqualTo(5L);
        verify(stockMovementService).getMovementsByIngredient(5L);
    }

    @Test
    @DisplayName("getWasteSummary — returns aggregated metrics summary DTO")
    void getWasteSummary_nominal_success() {
        Map<StockWasteReason, BigDecimal> lossMap = new EnumMap<>(StockWasteReason.class);
        lossMap.put(StockWasteReason.CASSE, new BigDecimal("22.00"));
        Map<StockWasteReason, Long> countMap = new EnumMap<>(StockWasteReason.class);
        countMap.put(StockWasteReason.CASSE, 1L);

        StockWasteSummaryDTO summary = new StockWasteSummaryDTO(
                1,
                new BigDecimal("22.00"),
                new BigDecimal("1.00"),
                lossMap,
                countMap
        );

        when(stockMovementService.getWasteSummary()).thenReturn(summary);

        ResponseEntity<StockWasteSummaryDTO> response = stockMovementController.getWasteSummary();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalMovements()).isEqualTo(1);
        assertThat(response.getBody().totalLossValue()).isEqualTo(new BigDecimal("22.00"));
        assertThat(response.getBody().countByReason()).containsEntry(StockWasteReason.CASSE, 1L);
    }
}
