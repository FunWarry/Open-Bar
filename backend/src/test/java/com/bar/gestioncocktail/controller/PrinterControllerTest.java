package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PrintResultDTO;
import com.bar.gestioncocktail.dto.PrinterConnectionTestRequest;
import com.bar.gestioncocktail.dto.PrinterStatusDTO;
import com.bar.gestioncocktail.model.PrinterRole;
import com.bar.gestioncocktail.service.printing.EscPosPrintingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrinterControllerTest {

    @Mock
    private EscPosPrintingService printingService;

    @InjectMocks
    private PrinterController printerController;

    private PrinterStatusDTO statusDTO;

    @BeforeEach
    void setUp() {
        statusDTO = new PrinterStatusDTO(
                true,
                "192.168.1.10",
                "192.168.1.11",
                "192.168.1.12",
                9100
        );
    }

    @Test
    @DisplayName("getStatus delegates to service and returns 200 OK with PrinterStatusDTO")
    void getStatus_returnsStatusDTO() {
        when(printingService.getPrinterStatus()).thenReturn(statusDTO);

        ResponseEntity<PrinterStatusDTO> response = printerController.getStatus();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().directPrintingEnabled()).isTrue();
        assertThat(response.getBody().barPrinterIp()).isEqualTo("192.168.1.10");
        verify(printingService).getPrinterStatus();
    }

    @Test
    @DisplayName("testPrintRole dispatches test print for role and returns PrintResultDTO")
    void testPrintRole_dispatchesToService() {
        PrintResultDTO result = PrintResultDTO.success(PrinterRole.BAR, "192.168.1.10", 9100, "OK");
        when(printingService.printTestTicket(PrinterRole.BAR)).thenReturn(result);

        ResponseEntity<PrintResultDTO> response = printerController.testPrintRole(PrinterRole.BAR);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isTrue();
        verify(printingService).printTestTicket(PrinterRole.BAR);
    }

    @Test
    @DisplayName("testConnection tests raw socket and returns PrintResultDTO")
    void testConnection_delegatesToService() {
        PrinterConnectionTestRequest request = new PrinterConnectionTestRequest("192.168.1.50", 9100, PrinterRole.KITCHEN);
        PrintResultDTO result = PrintResultDTO.success(PrinterRole.KITCHEN, "192.168.1.50", 9100, "OK");
        when(printingService.testConnection("192.168.1.50", 9100, PrinterRole.KITCHEN)).thenReturn(result);

        ResponseEntity<PrintResultDTO> response = printerController.testConnection(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isTrue();
        verify(printingService).testConnection("192.168.1.50", 9100, PrinterRole.KITCHEN);
    }

    @Test
    @DisplayName("dispatchOrder dispatches tickets for order and returns list of results")
    void dispatchOrder_delegatesToService() {
        PrintResultDTO r1 = PrintResultDTO.success(PrinterRole.BAR, "192.168.1.10", 9100, "OK");
        when(printingService.dispatchOrder(42L)).thenReturn(List.of(r1));

        ResponseEntity<List<PrintResultDTO>> response = printerController.dispatchOrder(42L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        verify(printingService).dispatchOrder(42L);
    }

    @Test
    @DisplayName("printInvoiceReceipt delegates to service and returns PrintResultDTO")
    void printInvoiceReceipt_delegatesToService() {
        PrintResultDTO result = PrintResultDTO.success(PrinterRole.CASH_DESK, "192.168.1.12", 9100, "OK");
        when(printingService.printInvoiceReceipt(100L, true)).thenReturn(result);

        ResponseEntity<PrintResultDTO> response = printerController.printInvoiceReceipt(100L, true);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isTrue();
        verify(printingService).printInvoiceReceipt(100L, true);
    }

    @Test
    @DisplayName("openCashDrawer delegates to service and returns PrintResultDTO")
    void openCashDrawer_delegatesToService() {
        PrintResultDTO result = PrintResultDTO.success(PrinterRole.CASH_DESK, "192.168.1.12", 9100, "OK");
        when(printingService.openCashDrawer()).thenReturn(result);

        ResponseEntity<PrintResultDTO> response = printerController.openCashDrawer();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isTrue();
        verify(printingService).openCashDrawer();
    }
}
