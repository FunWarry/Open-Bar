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
}
