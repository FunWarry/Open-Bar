package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.model.AvoirCredit;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.FactureService;
import com.bar.gestioncocktail.service.PdfService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FactureControllerTest {

    @Mock
    private FactureService factureService;

    @Mock
    private PdfService pdfService;

    @InjectMocks
    private FactureController factureController;

    private Facture facture;
    private TableEntity table;

    @BeforeEach
    void setUp() {
        table = new TableEntity();
        table.setId(1L);
        table.setNumero(5);

        facture = new Facture();
        facture.setId(10L);
        facture.setTable(table);
        facture.setNumero("FAC-2026-00010");
        facture.setTotal(new BigDecimal("50.00"));
        facture.setTotalHT(new BigDecimal("41.67"));
        facture.setTotalVAT(new BigDecimal("8.33"));
        facture.setTotalTTC(new BigDecimal("50.00"));
        facture.setModePaiement("CARTE_BANCAIRE");
        facture.setReglee(false);
        facture.setDateFacture(LocalDateTime.now());
    }

    @Test
    @DisplayName("getAllFactures - returns all invoices as DTOs")
    void getAllFactures_returnsList() {
        when(factureService.getAllFactures()).thenReturn(List.of(facture));

        ResponseEntity<List<FactureResponseDTO>> response = factureController.getAllFactures();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("createFacture and updateFacture - mutations")
    void mutations() {
        FactureRequestDTO request = new FactureRequestDTO(1L, "Notes", BigDecimal.ZERO, "CARTE_BANCAIRE");
        when(factureService.createFacture(any(Facture.class))).thenReturn(facture);
        when(factureService.updateFacture(eq(10L), any(Facture.class))).thenReturn(facture);

        ResponseEntity<FactureResponseDTO> createResp = factureController.createFacture(request);
        ResponseEntity<FactureResponseDTO> updateResp = factureController.updateFacture(10L, request);

        assertThat(createResp.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(updateResp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("deleteFacture and getFactureById")
    void deleteAndGet() {
        when(factureService.getFactureById(10L)).thenReturn(Optional.of(facture));
        when(factureService.getFactureById(99L)).thenReturn(Optional.empty());

        ResponseEntity<Void> deleteResp = factureController.deleteFacture(10L);
        ResponseEntity<FactureResponseDTO> getFound = factureController.getFactureById(10L);
        ResponseEntity<FactureResponseDTO> getNotFound = factureController.getFactureById(99L);

        assertThat(deleteResp.getStatusCode().value()).isEqualTo(200);
        assertThat(getFound.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(getNotFound.getStatusCode().value()).isEqualTo(404);
        verify(factureService).deleteFacture(10L);
    }

    @Test
    @DisplayName("getFacturesByTable and getFacturesByDate - query endpoints")
    void queries() {
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now().plusDays(1);

        when(factureService.getFacturesByTable(any(TableEntity.class))).thenReturn(List.of(facture));
        when(factureService.getFacturesByDate(start, end)).thenReturn(List.of(facture));

        assertThat(factureController.getFacturesByTable(1L).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(factureController.getFacturesByDate(start, end).getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("ajouterItem and retirerItem - item modifications")
    void itemModifications() {
        FactureItemRequestDTO itemReq = new FactureItemRequestDTO(1L, "Mojito", 2, new BigDecimal("8.50"), "Sans sucre");
        when(factureService.ajouterItem(eq(10L), any(FactureItem.class))).thenReturn(facture);
        when(factureService.retirerItem(10L, 1L)).thenReturn(facture);

        ResponseEntity<FactureResponseDTO> addResp = factureController.ajouterItem(10L, itemReq);
        ResponseEntity<FactureResponseDTO> removeResp = factureController.retirerItem(10L, 1L);

        assertThat(addResp.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(removeResp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("getTableAddition and encaisserTable - table billing")
    void tableBilling() {
        TableAdditionResponseDTO addition = new TableAdditionResponseDTO(1L, 5, "Terrasse", 1L, "Serveur", LocalDateTime.now(), List.of(), List.of(), new BigDecimal("41.67"), new BigDecimal("8.33"), new BigDecimal("50.00"), 2, false, null);
        EncaissementRequestDTO encaisseReq = new EncaissementRequestDTO("CARTE", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, null, null, true, List.of());

        when(factureService.getTableAddition(1L)).thenReturn(addition);
        when(factureService.encaisserTable(eq(1L), any(EncaissementRequestDTO.class))).thenReturn(FactureResponseDTO.from(facture));

        ResponseEntity<TableAdditionResponseDTO> addResp = factureController.getTableAddition(1L);
        ResponseEntity<FactureResponseDTO> encResp = factureController.encaisserTable(1L, encaisseReq);

        assertThat(addResp.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(encResp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("splitEgal and splitParSelection - bill splits")
    void splitEndpoints() {
        SplitResultDTO splitDto = new SplitResultDTO(10L, "Guest 1", List.of(), new BigDecimal("25.00"), new BigDecimal("25.00"));
        SplitEgalRequest egalReq = new SplitEgalRequest(2);
        SplitAdditionRequest itemReq = new SplitAdditionRequest(List.of());

        when(factureService.splitEgal(10L, 2)).thenReturn(List.of(splitDto));
        when(factureService.splitParSelection(eq(10L), any())).thenReturn(List.of(splitDto));

        ResponseEntity<List<SplitResultDTO>> resp1 = factureController.splitEgal(10L, egalReq);
        ResponseEntity<List<SplitResultDTO>> resp2 = factureController.splitParSelection(10L, itemReq);

        assertThat(resp1.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(resp2.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("fusionnerFactures and reglerFacture")
    void mergeAndPay() {
        MergeFacturesRequestDTO mergeReq = new MergeFacturesRequestDTO(List.of(1L, 2L), 1L);
        when(factureService.fusionnerFactures(mergeReq)).thenReturn(facture);
        when(factureService.reglerFacture(10L, "CARTE", new BigDecimal("2.00"))).thenReturn(facture);

        ResponseEntity<FactureResponseDTO> mergeResp = factureController.fusionnerFactures(mergeReq);
        ResponseEntity<FactureResponseDTO> payResp = factureController.reglerFacture(10L, "CARTE", new BigDecimal("2.00"));

        assertThat(mergeResp.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(payResp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("encaisserPart and getReglements endpoints")
    void encaisserAndGetReglements() {
        com.bar.gestioncocktail.dto.FactureReglementDTO reglementDto = new com.bar.gestioncocktail.dto.FactureReglementDTO(
                1L, 10L, "Convive 1", 1, 2, new BigDecimal("25.00"), BigDecimal.ZERO,
                new BigDecimal("25.00"), "CARTE", "EGAL", List.of(), LocalDateTime.now()
        );
        com.bar.gestioncocktail.dto.EncaisserPartRequest req = new com.bar.gestioncocktail.dto.EncaisserPartRequest(
                "Convive 1", 1, 2, new BigDecimal("25.00"), BigDecimal.ZERO,
                new BigDecimal("25.00"), "CARTE", "EGAL", List.of()
        );

        when(factureService.encaisserPart(10L, req)).thenReturn(reglementDto);
        when(factureService.getReglementsByFactureId(10L)).thenReturn(List.of(reglementDto));

        ResponseEntity<com.bar.gestioncocktail.dto.FactureReglementDTO> resp1 = factureController.encaisserPart(10L, req);
        ResponseEntity<List<com.bar.gestioncocktail.dto.FactureReglementDTO>> resp2 = factureController.getReglements(10L);

        assertThat(resp1.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(resp1.getBody()).isNotNull();
        assertThat(resp1.getBody().nomConvive()).isEqualTo("Convive 1");

        assertThat(resp2.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(resp2.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("downloadFacturePdf, exportCSV, getVatSummary, createAvoir, verifyIntegrity, getDailyRecap, downloadDailyRecapPdf")
    void exportsAndReports() {
        LocalDate today = LocalDate.now();
        DailyRecapDTO recap = new DailyRecapDTO(today, new BigDecimal("100.00"), new BigDecimal("83.33"), new BigDecimal("16.67"), 2, new BigDecimal("50.00"), 4, List.of(), List.of());
        VatMonthlySummaryDTO vat = new VatMonthlySummaryDTO("2026-08", new BigDecimal("41.67"), Map.of(), new BigDecimal("8.33"), new BigDecimal("50.00"));
        AvoirCredit avoir = new AvoirCredit();
        avoir.setId(100L);

        when(factureService.getFactureById(10L)).thenReturn(Optional.of(facture));
        when(pdfService.generateFacturePdf(facture)).thenReturn(new byte[]{1, 2, 3});
        when(factureService.exportCSV(any(), any())).thenReturn("CSV;DATA");
        when(factureService.getVatMonthlySummary("2026-08")).thenReturn(vat);
        when(factureService.annulerFactureWithAvoir(10L, "Motif")).thenReturn(avoir);
        when(factureService.verifyIntegrity(eq(10L), any())).thenReturn(Map.of("valid", true));
        when(factureService.getDailyRecap(today)).thenReturn(recap);
        when(pdfService.generateDailyRecapPdf(recap)).thenReturn(new byte[]{4, 5});

        assertThat(factureController.downloadFacturePdf(10L).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(factureController.exportCSV("2026-08-01", "2026-08-16").getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(factureController.getVatSummary("2026-08").getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(factureController.createAvoir(10L, "Motif").getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(factureController.verifyIntegrity(10L).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(factureController.getDailyRecap(today).getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(factureController.downloadDailyRecapPdf(today).getStatusCode().is2xxSuccessful()).isTrue();
    }
}
