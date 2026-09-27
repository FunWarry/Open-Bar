package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.model.RoulettePrizeType;
import com.bar.gestioncocktail.service.RouletteService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link RouletteController}.
 */
@ExtendWith(MockitoExtension.class)
class RouletteControllerTest {

    @Mock
    private RouletteService rouletteService;

    @InjectMocks
    private RouletteController controller;

    @Test
    @DisplayName("triggerBroadcast returns 200 with broadcast result")
    void triggerBroadcast_returns200() {
        RouletteBroadcastSpinRequestDTO request = new RouletteBroadcastSpinRequestDTO(
                null, "FAIR", null, null, null, false, 5, "CSGO"
        );
        RouletteSpinResultDTO result = new RouletteSpinResultDTO(
                1L, 0, RoulettePrizeType.COCKTAIL, 10L, "Mojito",
                "Description", null, new BigDecimal("7.50"),
                null, null, true, false, List.of()
        );
        when(rouletteService.triggerBroadcastSpin(request)).thenReturn(result);

        ResponseEntity<RouletteSpinResultDTO> response = controller.triggerBroadcast(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().cocktailNom()).isEqualTo("Mojito");
        verify(rouletteService).triggerBroadcastSpin(request);
    }

    @Test
    @DisplayName("getAllSectors returns 200 with list of sectors")
    void getAllSectors_returns200() {
        RouletteWheelSectorDTO dto = new RouletteWheelSectorDTO(
                1L, "Mojito", RoulettePrizeType.COCKTAIL, 10L, "Mojito",
                null, null, new BigDecimal("7.50"), "#10b981", "leaf-outline", 2, true, 0
        );
        when(rouletteService.getAllSectors()).thenReturn(List.of(dto));

        ResponseEntity<List<RouletteWheelSectorDTO>> response = controller.getAllSectors();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("createSector returns 201 with created sector")
    void createSector_returns201() {
        RouletteWheelSectorRequestDTO request = new RouletteWheelSectorRequestDTO(
                "Mojito", RoulettePrizeType.COCKTAIL, 10L, null,
                new BigDecimal("7.50"), "#10b981", "leaf-outline", 2, true, 0
        );
        RouletteWheelSectorDTO created = new RouletteWheelSectorDTO(
                1L, "Mojito", RoulettePrizeType.COCKTAIL, 10L, "Mojito",
                null, null, new BigDecimal("7.50"), "#10b981", "leaf-outline", 2, true, 0
        );
        when(rouletteService.createSector(request)).thenReturn(created);

        ResponseEntity<RouletteWheelSectorDTO> response = controller.createSector(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("updateSector returns 200 with updated sector")
    void updateSector_returns200() {
        RouletteWheelSectorRequestDTO request = new RouletteWheelSectorRequestDTO(
                "Mojito Royal", RoulettePrizeType.COCKTAIL, 10L, null,
                new BigDecimal("10.00"), "#10b981", "leaf-outline", 2, true, 0
        );
        RouletteWheelSectorDTO updated = new RouletteWheelSectorDTO(
                1L, "Mojito Royal", RoulettePrizeType.COCKTAIL, 10L, "Mojito Royal",
                null, null, new BigDecimal("10.00"), "#10b981", "leaf-outline", 2, true, 0
        );
        when(rouletteService.updateSector(1L, request)).thenReturn(updated);

        ResponseEntity<RouletteWheelSectorDTO> response = controller.updateSector(1L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().label()).isEqualTo("Mojito Royal");
    }

    @Test
    @DisplayName("deleteSector returns 204")
    void deleteSector_returns204() {
        ResponseEntity<Void> response = controller.deleteSector(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(rouletteService).deleteSector(1L);
    }
}
