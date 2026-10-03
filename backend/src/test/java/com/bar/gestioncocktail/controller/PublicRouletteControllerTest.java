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
 * Unit tests for {@link PublicRouletteController}.
 */
@ExtendWith(MockitoExtension.class)
class PublicRouletteControllerTest {

    @Mock
    private RouletteService rouletteService;

    @InjectMocks
    private PublicRouletteController controller;

    @Test
    @DisplayName("getConfig returns 200 with public config")
    void getConfigReturns200() {
        RoulettePublicConfigDTO config = new RoulettePublicConfigDTO(
                true, new BigDecimal("7.50"), new BigDecimal("5.50"),
                "BALANCED", "CSGO", List.of(), List.of("ALL")
        );
        when(rouletteService.getPublicConfig()).thenReturn(config);

        ResponseEntity<RoulettePublicConfigDTO> response = controller.getConfig();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().enabled()).isTrue();
    }

    @Test
    @DisplayName("spin returns 200 with resolved outcome")
    void spinReturns200WithResult() {
        RouletteSpinRequestDTO request = new RouletteSpinRequestDTO(
                null, null, null, null, false, List.of(), false
        );
        RouletteSpinResultDTO result = new RouletteSpinResultDTO(
                1L, 0, RoulettePrizeType.COCKTAIL, 10L, "Mojito",
                "Fresh mint and rum", null, new BigDecimal("7.50"),
                null, null, true, false, List.of()
        );
        when(rouletteService.spin(request)).thenReturn(result);

        ResponseEntity<RouletteSpinResultDTO> response = controller.spin(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().cocktailNom()).isEqualTo("Mojito");
        verify(rouletteService).spin(request);
    }
}
