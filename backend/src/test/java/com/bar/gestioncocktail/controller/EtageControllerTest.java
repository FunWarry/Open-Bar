package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.EtageRequestDTO;
import com.bar.gestioncocktail.dto.EtageResponseDTO;
import com.bar.gestioncocktail.model.EtageEntity;
import com.bar.gestioncocktail.service.EtageService;
import org.junit.jupiter.api.BeforeEach;
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

/**
 * Unit tests for {@link EtageController}.
 */
@ExtendWith(MockitoExtension.class)
class EtageControllerTest {

    @Mock
    private EtageService etageService;

    @InjectMocks
    private EtageController etageController;

    private EtageEntity etage;

    @BeforeEach
    void setUp() {
        etage = new EtageEntity();
        etage.setId(1L);
        etage.setCode("RDC");
        etage.setNom("Rez-de-chaussée");
        etage.setOrdre(1);
    }

    @Test
    void getAllEtages_shouldReturnListOfEtageResponseDTOs() {
        when(etageService.getAllEtages()).thenReturn(List.of(etage));

        ResponseEntity<List<EtageResponseDTO>> response = etageController.getAllEtages();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull().hasSize(1);
        assertThat(response.getBody().get(0).code()).isEqualTo("RDC");
        verify(etageService).getAllEtages();
    }

    @Test
    void getEtageById_shouldReturnEtageResponseDTO() {
        when(etageService.getEtageById(1L)).thenReturn(etage);

        ResponseEntity<EtageResponseDTO> response = etageController.getEtageById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(1L);
        assertThat(response.getBody().code()).isEqualTo("RDC");
        verify(etageService).getEtageById(1L);
    }

    @Test
    void createEtage_shouldReturnCreatedStatusAndDTO() {
        EtageRequestDTO dto = new EtageRequestDTO("VIP", "Espace VIP", 10);
        EtageEntity created = new EtageEntity();
        created.setId(2L);
        created.setCode("VIP");
        created.setNom("Espace VIP");
        created.setOrdre(10);

        when(etageService.createEtage("VIP", "Espace VIP", 10)).thenReturn(created);

        ResponseEntity<EtageResponseDTO> response = etageController.createEtage(dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("VIP");
        verify(etageService).createEtage("VIP", "Espace VIP", 10);
    }

    @Test
    void updateEtage_shouldReturnUpdatedStatusAndDTO() {
        EtageRequestDTO dto = new EtageRequestDTO("RDC", "Rez-de-chaussée Modifié", 1);
        EtageEntity updated = new EtageEntity();
        updated.setId(1L);
        updated.setCode("RDC");
        updated.setNom("Rez-de-chaussée Modifié");
        updated.setOrdre(1);

        when(etageService.updateEtage(1L, "RDC", "Rez-de-chaussée Modifié", 1)).thenReturn(updated);

        ResponseEntity<EtageResponseDTO> response = etageController.updateEtage(1L, dto);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().nom()).isEqualTo("Rez-de-chaussée Modifié");
        verify(etageService).updateEtage(1L, "RDC", "Rez-de-chaussée Modifié", 1);
    }

    @Test
    void deleteEtage_shouldReturnNoContent() {
        ResponseEntity<Void> response = etageController.deleteEtage(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(etageService).deleteEtage(1L);
    }

    @Test
    void etageResponseDTO_fromNull_shouldReturnNull() {
        assertThat(EtageResponseDTO.from(null)).isNull();
    }
}
