package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.MergeFacturesRequestDTO;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.FactureService;
import com.bar.gestioncocktail.service.PdfService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FactureControllerTest {

    @Mock
    FactureService factureService;

    @Mock
    PdfService pdfService;

    @InjectMocks
    FactureController factureController;

    private Facture facture;

    @BeforeEach
    void setUp() {
        TableEntity table = new TableEntity();
        table.setId(1L);

        facture = new Facture();
        facture.setId(10L);
        facture.setTable(table);
        facture.setNumero("FAC-100");
        facture.setTotal(new BigDecimal("50.00"));
    }

    @Test
    void fusionnerFactures_appelleServiceEtRetourneFactureResponseDTO() {
        MergeFacturesRequestDTO request = new MergeFacturesRequestDTO(List.of(1L, 2L), 1L);
        when(factureService.fusionnerFactures(any(MergeFacturesRequestDTO.class))).thenReturn(facture);

        ResponseEntity<?> response = factureController.fusionnerFactures(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(factureService).fusionnerFactures(request);
    }

    @Test
    void getDailyRecap_retourneRecapDTO() {
        java.time.LocalDate today = java.time.LocalDate.now();
        com.bar.gestioncocktail.dto.DailyRecapDTO recap = new com.bar.gestioncocktail.dto.DailyRecapDTO(
            today,
            new BigDecimal("100.00"),
            new BigDecimal("83.33"),
            new BigDecimal("16.67"),
            2,
            new BigDecimal("50.00"),
            4,
            List.of(),
            List.of()
        );
        when(factureService.getDailyRecap(today)).thenReturn(recap);

        ResponseEntity<com.bar.gestioncocktail.dto.DailyRecapDTO> response = factureController.getDailyRecap(today);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo(recap);
        verify(factureService).getDailyRecap(today);
    }

    @Test
    void downloadDailyRecapPdf_retourneOctetsPdf() {
        java.time.LocalDate today = java.time.LocalDate.now();
        com.bar.gestioncocktail.dto.DailyRecapDTO recap = new com.bar.gestioncocktail.dto.DailyRecapDTO(
            today,
            new BigDecimal("100.00"),
            new BigDecimal("83.33"),
            new BigDecimal("16.67"),
            2,
            new BigDecimal("50.00"),
            4,
            List.of(),
            List.of()
        );
        byte[] expectedPdf = new byte[]{1, 2, 3};
        when(factureService.getDailyRecap(today)).thenReturn(recap);
        when(pdfService.generateDailyRecapPdf(recap)).thenReturn(expectedPdf);

        ResponseEntity<byte[]> response = factureController.downloadDailyRecapPdf(today);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo(expectedPdf);
        verify(factureService).getDailyRecap(today);
        verify(pdfService).generateDailyRecapPdf(recap);
    }

    @Test
    void reglerFacture_avecPourboire_appelleService() {
        when(factureService.reglerFacture(10L, "ESPECES", new BigDecimal("3.50"))).thenReturn(facture);

        ResponseEntity<?> response = factureController.reglerFacture(10L, "ESPECES", new BigDecimal("3.50"));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(factureService).reglerFacture(10L, "ESPECES", new BigDecimal("3.50"));
    }

    @Test
    void getTableAddition_appelleServiceEtRetourneDTO() {
        com.bar.gestioncocktail.dto.TableAdditionResponseDTO addition = new com.bar.gestioncocktail.dto.TableAdditionResponseDTO(
                1L,
                5,
                "Salle",
                2L,
                "Serveur 1",
                java.time.LocalDateTime.now(),
                List.of(),
                List.of(101L),
                new BigDecimal("20.00"),
                new BigDecimal("4.00"),
                new BigDecimal("24.00"),
                3,
                false,
                null
        );

        when(factureService.getTableAddition(1L)).thenReturn(addition);

        ResponseEntity<com.bar.gestioncocktail.dto.TableAdditionResponseDTO> response = factureController.getTableAddition(1L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo(addition);
        verify(factureService).getTableAddition(1L);
    }

    @Test
    void encaisserTable_appelleServiceEtRetourneFactureResponseDTO() {
        com.bar.gestioncocktail.dto.EncaissementRequestDTO request = new com.bar.gestioncocktail.dto.EncaissementRequestDTO(
                "CARTE",
                new BigDecimal("2.00"),
                null,
                null,
                null,
                "Settlement table 1",
                true,
                null
        );

        com.bar.gestioncocktail.dto.FactureResponseDTO responseDTO = com.bar.gestioncocktail.dto.FactureResponseDTO.from(facture);
        when(factureService.encaisserTable(1L, request)).thenReturn(responseDTO);

        ResponseEntity<com.bar.gestioncocktail.dto.FactureResponseDTO> response = factureController.encaisserTable(1L, request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo(responseDTO);
        verify(factureService).encaisserTable(1L, request);
    }
}
