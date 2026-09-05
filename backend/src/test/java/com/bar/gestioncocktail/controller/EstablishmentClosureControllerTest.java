package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EstablishmentClosureDTO;
import com.bar.gestioncocktail.dto.EstablishmentClosureRequestDTO;
import com.bar.gestioncocktail.model.ClosureType;
import com.bar.gestioncocktail.service.EstablishmentClosureService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("EstablishmentClosureController Unit Tests")
class EstablishmentClosureControllerTest {

    @Mock
    private EstablishmentClosureService closureService;

    @InjectMocks
    private EstablishmentClosureController controller;

    @Test
    @DisplayName("GET /api/closures - Returns list of closures")
    void getAllClosures_returnsList() {
        EstablishmentClosureDTO dto = new EstablishmentClosureDTO(
                1L,
                ClosureType.WEEKLY_RECURRING,
                DayOfWeek.MONDAY,
                null,
                null,
                false,
                "Fermeture hebdo"
        );
        when(closureService.getAllClosures()).thenReturn(List.of(dto));

        List<EstablishmentClosureDTO> result = controller.getAllClosures();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).dayOfWeek()).isEqualTo(DayOfWeek.MONDAY);
        verify(closureService).getAllClosures();
    }

    @Test
    @DisplayName("POST /api/closures - Creates and returns new closure")
    void createClosure_returnsCreatedDto() {
        EstablishmentClosureRequestDTO req = new EstablishmentClosureRequestDTO(
                ClosureType.EXCEPTIONAL,
                null,
                LocalDate.of(2026, 12, 25),
                LocalDate.of(2026, 12, 26),
                true,
                "Christmas"
        );
        EstablishmentClosureDTO created = new EstablishmentClosureDTO(
                2L,
                ClosureType.EXCEPTIONAL,
                null,
                LocalDate.of(2026, 12, 25),
                LocalDate.of(2026, 12, 26),
                true,
                "Christmas"
        );
        when(closureService.createClosure(req)).thenReturn(created);

        EstablishmentClosureDTO response = controller.createClosure(req);

        assertThat(response.id()).isEqualTo(2L);
        assertThat(response.reason()).isEqualTo("Christmas");
        verify(closureService).createClosure(req);
    }

    @Test
    @DisplayName("DELETE /api/closures/{id} - Calls service delete")
    void deleteClosure_callsService() {
        controller.deleteClosure(5L);

        verify(closureService).deleteClosure(5L);
    }
}
