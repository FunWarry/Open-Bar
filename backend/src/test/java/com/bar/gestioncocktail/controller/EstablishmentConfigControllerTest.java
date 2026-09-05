package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EstablishmentConfigDTO;
import com.bar.gestioncocktail.dto.EstablishmentConfigUpdateRequest;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import com.bar.gestioncocktail.service.TimeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
            "France", "fr",
            "0102030405", "email@bar.fr", "Immediate", "None", new BigDecimal("0.12"),
            "SYSTEM", "80mm", LocalDateTime.now(), LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("getConfig - delegates to service and returns DTO")
    void getConfig_delegates() {
        when(service.getConfigDTO()).thenReturn(dto);

        ResponseEntity<EstablishmentConfigDTO> response = controller.getConfig();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().legalName()).isEqualTo("OpenBar SARL");
    }

    @Test
    @DisplayName("getTimeZones - delegates to timeService")
    void getTimeZones_delegates() {
        when(timeService.getAvailableTimeZones()).thenReturn(List.of("Europe/Paris", "UTC"));

        ResponseEntity<List<String>> response = controller.getTimeZones();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Europe/Paris", "UTC");
    }

    @Test
    @DisplayName("updateConfig - delegates to service and returns updated DTO")
    void updateConfig_delegates() {
        EstablishmentConfigUpdateRequest req = new EstablishmentConfigUpdateRequest(
            "OpenBar SAS", "SAS", "73282932000074", "Lyon", "B 456",
            "FR12732829320", "5630Z", new BigDecimal("20000"), "Nouvelle adresse",
            "France", "fr",
            "0600000000", "contact@openbar.fr", "30 jours", "Pénalités", new BigDecimal("0.15"),
            "Europe/Paris", "80mm"
        );

        when(service.updateConfig(any(EstablishmentConfigUpdateRequest.class))).thenReturn(dto);

        ResponseEntity<EstablishmentConfigDTO> response = controller.updateConfig(req);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(service).updateConfig(req);
    }
}
