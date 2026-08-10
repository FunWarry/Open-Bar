package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.ShiftPresetDTO;
import com.bar.gestioncocktail.model.TypeShift;
import com.bar.gestioncocktail.service.ShiftPresetService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ShiftPresetController Unit Tests")
class ShiftPresetControllerTest {

    @Mock
    private ShiftPresetService presetService;

    @InjectMocks
    private ShiftPresetController controller;

    @Test
    @DisplayName("GET /api/shift-presets - Returns all presets")
    void getAllPresets_returnsList() {
        ShiftPresetDTO dto = new ShiftPresetDTO(1L, TypeShift.MATIN, "Matin", "08:00", "16:00", 30);
        when(presetService.getAllPresets()).thenReturn(List.of(dto));

        ResponseEntity<List<ShiftPresetDTO>> response = controller.getAllPresets();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        verify(presetService).getAllPresets();
    }

    @Test
    @DisplayName("PUT /api/shift-presets/{typeShift} - Updates and returns preset")
    void updatePreset_returnsUpdatedDto() {
        ShiftPresetDTO dto = new ShiftPresetDTO(1L, TypeShift.MATIN, "Matin Modifié", "07:30", "15:30", 45);
        when(presetService.updatePreset(TypeShift.MATIN, dto)).thenReturn(dto);

        ResponseEntity<ShiftPresetDTO> response = controller.updatePreset(TypeShift.MATIN, dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(dto);
        verify(presetService).updatePreset(TypeShift.MATIN, dto);
    }
}
