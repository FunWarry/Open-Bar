package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PublicCommandeItemRequestDTO;
import com.bar.gestioncocktail.dto.PublicCommandeRequestDTO;
import com.bar.gestioncocktail.dto.PublicCommandeResponseDTO;
import com.bar.gestioncocktail.service.PublicCommandeService;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicCommandeControllerTest {

    @Mock
    PublicCommandeService publicCommandeService;

    @InjectMocks
    PublicCommandeController controller;

    @Test
    @DisplayName("creerCommande - creates public order and returns DTO")
    void creerCommande_success() {
        PublicCommandeItemRequestDTO item = new PublicCommandeItemRequestDTO(1L, null, 2, "Note");
        PublicCommandeRequestDTO request = new PublicCommandeRequestDTO(5L, List.of(item), "Urgent");

        PublicCommandeResponseDTO expectedResponse = PublicCommandeResponseDTO.builder()
                .commandeId(100L)
                .trackingToken("TOKEN-XYZ")
                .tempsEstimeMinutes(12)
                .build();

        when(publicCommandeService.creerCommandePublique(request)).thenReturn(expectedResponse);

        ResponseEntity<PublicCommandeResponseDTO> response = controller.creerCommande(request);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCommandeId()).isEqualTo(100L);
    }

    @Test
    @DisplayName("getCommandeParTrackingToken - returns order status DTO for valid tracking token")
    void getCommandeParTrackingToken_found() {
        PublicCommandeResponseDTO expectedResponse = PublicCommandeResponseDTO.builder()
                .commandeId(100L)
                .trackingToken("TOKEN-XYZ")
                .build();

        when(publicCommandeService.getCommandeParTrackingToken("TOKEN-XYZ")).thenReturn(expectedResponse);

        ResponseEntity<PublicCommandeResponseDTO> response = controller.getCommandeParTrackingToken("TOKEN-XYZ");

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTrackingToken()).isEqualTo("TOKEN-XYZ");
    }
}
