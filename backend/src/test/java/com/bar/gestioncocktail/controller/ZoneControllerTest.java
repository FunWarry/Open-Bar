package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.ZoneRequestDTO;
import com.bar.gestioncocktail.dto.ZoneResponseDTO;
import com.bar.gestioncocktail.model.ZoneEntity;
import com.bar.gestioncocktail.service.ZoneService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ZoneControllerTest {

    @Mock
    private ZoneService zoneService;

    @InjectMocks
    private ZoneController zoneController;

    private ZoneEntity zone;

    @BeforeEach
    void setUp() {
        zone = new ZoneEntity();
        zone.setId(1L);
        zone.setNom("Terrasse");
        zone.setCouleur("#123456");
        zone.setPlanX(10.0);
        zone.setPlanY(20.0);
        zone.setPlanWidth(30.0);
        zone.setPlanHeight(40.0);
    }

    @Test
    @DisplayName("getAllZones - returns all zones mapped to DTO")
    void getAllZones_returnsList() {
        when(zoneService.getAllZones()).thenReturn(List.of(zone));

        ResponseEntity<List<ZoneResponseDTO>> response = zoneController.getAllZones();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).nom()).isEqualTo("Terrasse");
    }

    @Test
    @DisplayName("getZoneById - returns single zone DTO")
    void getZoneById_returnsDto() {
        when(zoneService.getZoneById(1L)).thenReturn(zone);

        ResponseEntity<ZoneResponseDTO> response = zoneController.getZoneById(1L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("createZone - creates and returns new zone DTO")
    void createZone_success() {
        ZoneRequestDTO request = new ZoneRequestDTO("Terrasse", null, 10.0, 20.0, 30.0, 40.0, "RECTANGLE", null, null, "#123456");
        when(zoneService.createZone(any(ZoneEntity.class))).thenReturn(zone);

        ResponseEntity<ZoneResponseDTO> response = zoneController.createZone(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().nom()).isEqualTo("Terrasse");
    }

    @Test
    @DisplayName("updateZone - updates and returns updated zone DTO")
    void updateZone_success() {
        ZoneRequestDTO request = new ZoneRequestDTO("Veranda", null, 15.0, 25.0, 35.0, 45.0, "RECTANGLE", null, null, "#654321");
        zone.setNom("Veranda");
        when(zoneService.updateZone(eq(1L), any(ZoneEntity.class))).thenReturn(zone);

        ResponseEntity<ZoneResponseDTO> response = zoneController.updateZone(1L, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().nom()).isEqualTo("Veranda");
    }

    @Test
    @DisplayName("deleteZone - deletes zone and returns 204 No Content")
    void deleteZone_success() {
        ResponseEntity<Void> response = zoneController.deleteZone(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(zoneService).deleteZone(1L);
    }
}
