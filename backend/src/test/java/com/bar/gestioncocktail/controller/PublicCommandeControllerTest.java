package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PublicCommandeRequestDTO;
import com.bar.gestioncocktail.dto.PublicCommandeResponseDTO;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.service.PublicCommandeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicCommandeControllerTest {

    @Mock
    private PublicCommandeService publicCommandeService;

    @InjectMocks
    private PublicCommandeController publicCommandeController;

    @Test
    void creerCommande_succes_retourne201() {
        PublicCommandeRequestDTO requestDTO = new PublicCommandeRequestDTO(1L, List.of(), "Table 1");
        PublicCommandeResponseDTO responseDTO = PublicCommandeResponseDTO.builder()
                .commandeId(100L)
                .trackingToken("uuid-token-xyz")
                .tableId(1L)
                .total(BigDecimal.valueOf(15.00))
                .statut(CommandeStatut.EN_ATTENTE)
                .tempsEstimeMinutes(10)
                .build();

        when(publicCommandeService.creerCommandePublique(any(PublicCommandeRequestDTO.class))).thenReturn(responseDTO);

        ResponseEntity<PublicCommandeResponseDTO> response = publicCommandeController.creerCommande(requestDTO);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCommandeId()).isEqualTo(100L);
        assertThat(response.getBody().getTrackingToken()).isEqualTo("uuid-token-xyz");
        assertThat(response.getBody().getTempsEstimeMinutes()).isEqualTo(10);
    }

    @Test
    void getCommandeParTrackingToken_succes_retourne200() {
        PublicCommandeResponseDTO responseDTO = PublicCommandeResponseDTO.builder()
                .commandeId(100L)
                .trackingToken("uuid-token-xyz")
                .tableId(1L)
                .statut(CommandeStatut.EN_PREPARATION)
                .tempsEstimeMinutes(3)
                .build();

        when(publicCommandeService.getCommandeParTrackingToken("uuid-token-xyz")).thenReturn(responseDTO);

        ResponseEntity<PublicCommandeResponseDTO> response = publicCommandeController.getCommandeParTrackingToken("uuid-token-xyz");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTrackingToken()).isEqualTo("uuid-token-xyz");
        assertThat(response.getBody().getStatut()).isEqualTo(CommandeStatut.EN_PREPARATION);
    }
}
