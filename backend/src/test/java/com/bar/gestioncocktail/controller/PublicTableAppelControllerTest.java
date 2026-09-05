package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.TableAppelRequestDTO;
import com.bar.gestioncocktail.dto.TableAppelResponseDTO;
import com.bar.gestioncocktail.model.TableAppelStatut;
import com.bar.gestioncocktail.model.TableAppelType;
import com.bar.gestioncocktail.service.TableAppelService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PublicTableAppelController}.
 */
@ExtendWith(MockitoExtension.class)
class PublicTableAppelControllerTest {

    @Mock
    private TableAppelService tableAppelService;

    @InjectMocks
    private PublicTableAppelController controller;

    @Test
    @DisplayName("appelerServeur - creates public table alert and returns 201 Created with DTO")
    void appelerServeur_success() {
        TableAppelRequestDTO request = new TableAppelRequestDTO(TableAppelType.ASSISTANCE, "Need help with menu");
        TableAppelResponseDTO expectedResponse = new TableAppelResponseDTO(
                1L, 5L, 12, "TERRASSE",
                TableAppelType.ASSISTANCE, TableAppelStatut.EN_ATTENTE,
                "Need help with menu", null,
                LocalDateTime.now(), LocalDateTime.now(), null
        );

        when(tableAppelService.creerAppel(5L, request)).thenReturn(expectedResponse);

        ResponseEntity<TableAppelResponseDTO> response = controller.appelerServeur(5L, request);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(1L);
        assertThat(response.getBody().tableId()).isEqualTo(5L);
        assertThat(response.getBody().type()).isEqualTo(TableAppelType.ASSISTANCE);
    }

    @Test
    @DisplayName("getActiveAppelsPourTable - returns list of active alerts for a table")
    void getActiveAppelsPourTable_success() {
        TableAppelResponseDTO alert1 = new TableAppelResponseDTO(
                1L, 5L, 12, "TERRASSE",
                TableAppelType.ASSISTANCE, TableAppelStatut.EN_ATTENTE,
                null, null,
                LocalDateTime.now(), LocalDateTime.now(), null
        );

        when(tableAppelService.getActiveAppelsPourTable(5L)).thenReturn(List.of(alert1));

        ResponseEntity<List<TableAppelResponseDTO>> response = controller.getActiveAppelsPourTable(5L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).type()).isEqualTo(TableAppelType.ASSISTANCE);
    }
}
