package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.model.InventoryAuditStatus;
import com.bar.gestioncocktail.service.InventoryAuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit and endpoint contract tests for {@link InventoryAuditController}.
 */
@ExtendWith(MockitoExtension.class)
class InventoryAuditControllerTest {

    @Mock
    private InventoryAuditService inventoryAuditService;

    @Mock
    private Authentication authentication;

    @Mock
    private HttpServletRequest httpServletRequest;

    @InjectMocks
    private InventoryAuditController controller;

    private InventoryAuditSessionResponseDTO sampleSession;

    @BeforeEach
    void setUp() {
        lenient().when(authentication.getName()).thenReturn("manager");
        lenient().when(httpServletRequest.getRemoteAddr()).thenReturn("127.0.0.1");

        sampleSession = new InventoryAuditSessionResponseDTO(
                1L,
                "INV-20260927-001",
                "Weekend Audit",
                InventoryAuditStatus.IN_PROGRESS,
                "ALL",
                "ALCOHOL",
                "manager",
                null,
                LocalDateTime.of(2026, 9, 27, 10, 0),
                LocalDateTime.of(2026, 9, 27, 10, 5),
                null,
                "Sample notes",
                BigDecimal.valueOf(1500.00),
                BigDecimal.valueOf(1450.00),
                BigDecimal.valueOf(-50.00),
                5,
                3,
                Collections.emptyList()
        );
    }

    @Test
    @DisplayName("createSession - returns HTTP 201 with created session response")
    void createSession_returns201() {
        CreateInventoryAuditSessionDTO request = new CreateInventoryAuditSessionDTO(
                "Weekend Audit", "ALL", "ALCOHOL", "Sample notes"
        );
        when(inventoryAuditService.createSession(request, "manager")).thenReturn(sampleSession);

        ResponseEntity<InventoryAuditSessionResponseDTO> response = controller.createSession(request, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().referenceCode()).isEqualTo("INV-20260927-001");
        verify(inventoryAuditService).createSession(request, "manager");
    }

    @Test
    @DisplayName("getAllSessions - returns HTTP 200 with list of audit sessions")
    void getAllSessions_returns200() {
        when(inventoryAuditService.getAllSessions()).thenReturn(List.of(sampleSession));

        ResponseEntity<List<InventoryAuditSessionResponseDTO>> response = controller.getAllSessions();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        verify(inventoryAuditService).getAllSessions();
    }

    @Test
    @DisplayName("getSessionById - returns HTTP 200 with session details")
    void getSessionById_returns200() {
        when(inventoryAuditService.getSessionById(1L)).thenReturn(sampleSession);

        ResponseEntity<InventoryAuditSessionResponseDTO> response = controller.getSessionById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(1L);
        verify(inventoryAuditService).getSessionById(1L);
    }

    @Test
    @DisplayName("getVarianceSummary - returns HTTP 200 with variance calculation metrics")
    void getVarianceSummary_returns200() {
        InventoryVarianceSummaryDTO summary = new InventoryVarianceSummaryDTO(
                BigDecimal.valueOf(1500.00),
                BigDecimal.valueOf(1450.00),
                BigDecimal.valueOf(-50.00),
                BigDecimal.valueOf(60.00),
                BigDecimal.valueOf(10.00),
                5,
                2,
                Map.of("ALCOHOL", BigDecimal.valueOf(-50.00)),
                Map.of("MAIN_BAR", BigDecimal.valueOf(1450.00))
        );
        when(inventoryAuditService.getVarianceSummary(1L)).thenReturn(summary);

        ResponseEntity<InventoryVarianceSummaryDTO> response = controller.getVarianceSummary(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalShrinkageValueHt()).isEqualByComparingTo(BigDecimal.valueOf(60.00));
        verify(inventoryAuditService).getVarianceSummary(1L);
    }

    @Test
    @DisplayName("startSession - returns HTTP 200 with updated session in IN_PROGRESS status")
    void startSession_returns200() {
        when(inventoryAuditService.startSession(1L, "manager")).thenReturn(sampleSession);

        ResponseEntity<InventoryAuditSessionResponseDTO> response = controller.startSession(1L, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        verify(inventoryAuditService).startSession(1L, "manager");
    }

    @Test
    @DisplayName("updateItemCount - returns HTTP 200 with updated item response")
    void updateItemCount_returns200() {
        UpdateInventoryAuditItemCountDTO request = new UpdateInventoryAuditItemCountDTO(
                "MAIN_BAR", 2, BigDecimal.valueOf(35.0), "Counter verified"
        );
        InventoryAuditItemResponseDTO itemResponse = new InventoryAuditItemResponseDTO(
                10L, 100L, "Rhum Blanc", "cl", "ALCOHOL", BigDecimal.valueOf(70.0),
                BigDecimal.valueOf(140.0), BigDecimal.valueOf(175.0), BigDecimal.valueOf(35.0),
                BigDecimal.valueOf(20.0), BigDecimal.valueOf(2800.0), BigDecimal.valueOf(3500.0),
                BigDecimal.valueOf(700.0), "Notes", Collections.emptyList()
        );
        when(inventoryAuditService.updateItemCount(1L, 10L, request, "manager")).thenReturn(itemResponse);

        ResponseEntity<InventoryAuditItemResponseDTO> response = controller.updateItemCount(1L, 10L, request, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().ingredientNom()).isEqualTo("Rhum Blanc");
        verify(inventoryAuditService).updateItemCount(1L, 10L, request, "manager");
    }

    @Test
    @DisplayName("batchUpdateCounts - returns HTTP 200 with updated session")
    void batchUpdateCounts_returns200() {
        BatchUpdateItemCountsDTO batchRequest = new BatchUpdateItemCountsDTO(List.of());
        when(inventoryAuditService.batchUpdateCounts(1L, batchRequest, "manager")).thenReturn(sampleSession);

        ResponseEntity<InventoryAuditSessionResponseDTO> response = controller.batchUpdateCounts(1L, batchRequest, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(inventoryAuditService).batchUpdateCounts(1L, batchRequest, "manager");
    }

    @Test
    @DisplayName("finalizeSession - returns HTTP 200 with finalized session")
    void finalizeSession_returns200() {
        when(inventoryAuditService.finalizeSession(eq(1L), eq("manager"), anyString())).thenReturn(sampleSession);

        ResponseEntity<InventoryAuditSessionResponseDTO> response = controller.finalizeSession(1L, authentication, httpServletRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(inventoryAuditService).finalizeSession(eq(1L), eq("manager"), anyString());
    }

    @Test
    @DisplayName("cancelSession - returns HTTP 200 with cancelled session")
    void cancelSession_returns200() {
        when(inventoryAuditService.cancelSession(1L, "manager")).thenReturn(sampleSession);

        ResponseEntity<InventoryAuditSessionResponseDTO> response = controller.cancelSession(1L, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(inventoryAuditService).cancelSession(1L, "manager");
    }

    @Test
    @DisplayName("exportPdf - returns HTTP 200 with application/pdf binary content")
    void exportPdf_returnsPdfBinary() {
        when(inventoryAuditService.exportPdf(1L)).thenReturn(new byte[]{0x25, 0x50, 0x44, 0x46});

        ResponseEntity<byte[]> response = controller.exportPdf(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_PDF);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).contains("inventaire-audit-1.pdf");
        assertThat(response.getBody()).isNotEmpty();
    }

    @Test
    @DisplayName("exportCsv - returns HTTP 200 with text/csv stream")
    void exportCsv_returnsCsvText() {
        byte[] csv = "Reference;Title;Status\nINV-001;Audit;IN_PROGRESS\n".getBytes();
        when(inventoryAuditService.exportCsv(1L)).thenReturn(csv);

        ResponseEntity<byte[]> response = controller.exportCsv(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType().toString()).contains("text/csv");
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).contains("inventaire-audit-1.csv");
        assertThat(response.getBody()).isEqualTo(csv);
    }
}
