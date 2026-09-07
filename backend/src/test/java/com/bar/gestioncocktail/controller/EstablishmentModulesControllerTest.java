package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EstablishmentModulesDTO;
import com.bar.gestioncocktail.dto.EstablishmentModulesUpdateRequest;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link EstablishmentModulesController}.
 */
@ExtendWith(MockitoExtension.class)
class EstablishmentModulesControllerTest {

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @InjectMocks
    private EstablishmentModulesController controller;

    @Test
    @DisplayName("getModules - returns current modules DTO with HTTP 200")
    void getModules_returnsModulesDTO() {
        EstablishmentModulesDTO dto = new EstablishmentModulesDTO(true, false, true, false, true, false);
        when(establishmentConfigService.getModulesDTO()).thenReturn(dto);

        ResponseEntity<EstablishmentModulesDTO> response = controller.getModules();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().cuisineKds()).isTrue();
        assertThat(response.getBody().happyHour()).isFalse();
        verify(establishmentConfigService).getModulesDTO();
    }

    @Test
    @DisplayName("updateModules - delegates to service and returns updated DTO with HTTP 200")
    void updateModules_delegatesToService() {
        EstablishmentModulesUpdateRequest request = new EstablishmentModulesUpdateRequest(
                false, true, false, true, false, true
        );
        EstablishmentModulesDTO updated = new EstablishmentModulesDTO(false, true, false, true, false, true);
        when(establishmentConfigService.updateModules(any(EstablishmentModulesUpdateRequest.class))).thenReturn(updated);

        ResponseEntity<EstablishmentModulesDTO> response = controller.updateModules(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().cuisineKds()).isFalse();
        assertThat(response.getBody().happyHour()).isTrue();
        verify(establishmentConfigService).updateModules(request);
    }
}
