package com.bar.gestioncocktail.controller;

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
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link TableAppelController}.
 */
@ExtendWith(MockitoExtension.class)
class TableAppelControllerTest {

    @Mock
    private TableAppelService tableAppelService;

    @InjectMocks
    private TableAppelController controller;

    @Test
    @DisplayName("getActiveAppels - returns all active pending alerts")
    void getActiveAppels_success() {
        TableAppelResponseDTO alert1 = new TableAppelResponseDTO(
                1L, 5L, 12, "TERRASSE",
                TableAppelType.ASSISTANCE, TableAppelStatut.EN_ATTENTE,
                null, null,
                LocalDateTime.now(), LocalDateTime.now(), null
        );

        when(tableAppelService.getActiveAppels()).thenReturn(List.of(alert1));

        List<TableAppelResponseDTO> response = controller.getActiveAppels();

        assertThat(response).isNotNull().hasSize(1);
        assertThat(response.get(0).id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getActiveAppelsForTable - returns active alerts for specified table")
    void getActiveAppelsForTable_success() {
        TableAppelResponseDTO alert1 = new TableAppelResponseDTO(
                1L, 5L, 12, "TERRASSE",
                TableAppelType.ADDITION, TableAppelStatut.EN_ATTENTE,
                null, null,
                LocalDateTime.now(), LocalDateTime.now(), null
        );

        when(tableAppelService.getActiveAppelsPourTable(5L)).thenReturn(List.of(alert1));

        List<TableAppelResponseDTO> response = controller.getActiveAppelsForTable(5L);

        assertThat(response).isNotNull().hasSize(1);
        assertThat(response.get(0).type()).isEqualTo(TableAppelType.ADDITION);
    }

    @Test
    @DisplayName("acquitterAppel - acknowledges single alert by authenticated staff")
    void acquitterAppel_success() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("waiter_john");

        TableAppelResponseDTO acknowledged = new TableAppelResponseDTO(
                10L, 5L, 12, "TERRASSE",
                TableAppelType.ASSISTANCE, TableAppelStatut.ACQUITTE,
                null, "waiter_john",
                LocalDateTime.now().minusMinutes(1), LocalDateTime.now(), LocalDateTime.now()
        );

        when(tableAppelService.acquitterAppel(5L, 10L, "waiter_john")).thenReturn(acknowledged);

        ResponseEntity<TableAppelResponseDTO> response = controller.acquitterAppel(5L, 10L, auth);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().statut()).isEqualTo(TableAppelStatut.ACQUITTE);
        assertThat(response.getBody().acquittePar()).isEqualTo("waiter_john");
    }

    @Test
    @DisplayName("acquitterTousAppels - acknowledges all active alerts for table")
    void acquitterTousAppels_success() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("waiter_john");

        TableAppelResponseDTO ack1 = new TableAppelResponseDTO(
                10L, 5L, 12, "TERRASSE",
                TableAppelType.ASSISTANCE, TableAppelStatut.ACQUITTE,
                null, "waiter_john",
                LocalDateTime.now().minusMinutes(1), LocalDateTime.now(), LocalDateTime.now()
        );
        TableAppelResponseDTO ack2 = new TableAppelResponseDTO(
                11L, 5L, 12, "TERRASSE",
                TableAppelType.ADDITION, TableAppelStatut.ACQUITTE,
                null, "waiter_john",
                LocalDateTime.now().minusMinutes(1), LocalDateTime.now(), LocalDateTime.now()
        );

        when(tableAppelService.acquitterTousAppelsTable(5L, "waiter_john")).thenReturn(List.of(ack1, ack2));

        ResponseEntity<List<TableAppelResponseDTO>> response = controller.acquitterTousAppels(5L, auth);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull().hasSize(2);
        assertThat(response.getBody()).allMatch(a -> a.statut() == TableAppelStatut.ACQUITTE);
    }
}
