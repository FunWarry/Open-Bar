package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.SafetyAlertRequestDTO;
import com.bar.gestioncocktail.dto.SafetyAlertResponseDTO;
import com.bar.gestioncocktail.model.SafetyAlertStatus;
import com.bar.gestioncocktail.model.SafetyAlertType;
import com.bar.gestioncocktail.service.SafetyAlertService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PublicSafetyAlertController} verifying patron Angel Shot silent emergency triggers.
 */
@ExtendWith(MockitoExtension.class)
class PublicSafetyAlertControllerTest {

    @Mock
    private SafetyAlertService safetyAlertService;

    @InjectMocks
    private PublicSafetyAlertController controller;

    @Test
    @DisplayName("triggerAlert - silently registers Angel Shot alert and returns 201 Created")
    void triggerAlert_success() {
        SafetyAlertRequestDTO request = new SafetyAlertRequestDTO(
                SafetyAlertType.ANGEL_SHOT_LIME,
                "Need immediate help"
        );

        SafetyAlertResponseDTO mockResponse = new SafetyAlertResponseDTO(
                1L,
                4L,
                7,
                SafetyAlertType.ANGEL_SHOT_LIME,
                SafetyAlertType.ANGEL_SHOT_LIME.getLabel(),
                SafetyAlertStatus.ACTIVE,
                "Need immediate help",
                null,
                LocalDateTime.now(),
                null
        );

        when(safetyAlertService.createAlert(4L, request)).thenReturn(mockResponse);

        ResponseEntity<SafetyAlertResponseDTO> response = controller.triggerSafetyAlert(4L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(1L);
        assertThat(response.getBody().tableId()).isEqualTo(4L);
        assertThat(response.getBody().tableNumero()).isEqualTo(7);
        assertThat(response.getBody().type()).isEqualTo(SafetyAlertType.ANGEL_SHOT_LIME);
    }
}
