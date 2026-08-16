package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EstablishmentConfigDTO;
import com.bar.gestioncocktail.dto.EstablishmentConfigUpdateRequest;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import com.bar.gestioncocktail.service.TimeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EstablishmentConfigControllerTest {

    @Mock
    private EstablishmentConfigService service;

    @Mock
    private TimeService timeService;

    @InjectMocks
    private EstablishmentConfigController controller;

    private EstablishmentConfigDTO dto;

    @BeforeEach
    void setUp() {
        dto = new EstablishmentConfigDTO(
            1L, "OpenBar SARL", "SARL", "73282932000074", "Paris", "B 123",
            "FR12732829320", "5630Z", new BigDecimal("10000"), "Adresse",
            "0102030405", "email@bar.fr", "Immediate", "None", new BigDecimal("0.12"),
            "SYSTEM", "80mm", LocalDateTime.now(), LocalDateTime.now()
        );
    }

    @Test
    void getConfig_delegueAuServiceEtRetourneDTO() {
        when(service.getConfigDTO()).thenReturn(dto);

        ResponseEntity<EstablishmentConfigDTO> response = controller.getConfig();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().legalName()).isEqualTo("OpenBar SARL");
    }

    @Test
    void updateConfig_delegueAuServiceEtRetourneDTOMisAJour() {
        when(service.updateConfig(any())).thenReturn(dto);

        EstablishmentConfigUpdateRequest request = new EstablishmentConfigUpdateRequest(
            "OpenBar SARL", "SARL", "73282932000074", "Paris", "B 123",
            "FR12732829320", "5630Z", new BigDecimal("10000"), "Adresse",
            "0102030405", "email@bar.fr", "Immediate", "None", new BigDecimal("0.12"),
            "SYSTEM", "80mm"
        );

        ResponseEntity<EstablishmentConfigDTO> response = controller.updateConfig(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        verify(service).updateConfig(any());
    }
}

