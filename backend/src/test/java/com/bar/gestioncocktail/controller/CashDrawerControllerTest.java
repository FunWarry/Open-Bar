package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.model.CashDrawerSessionStatus;
import com.bar.gestioncocktail.model.CashMovementType;
import com.bar.gestioncocktail.model.PrinterRole;
import com.bar.gestioncocktail.service.CashDrawerService;
import com.bar.gestioncocktail.service.PdfService;
import com.bar.gestioncocktail.service.printing.EscPosPrintingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link CashDrawerController}.
 */
@ExtendWith(MockitoExtension.class)
class CashDrawerControllerTest {

    @Mock
    private CashDrawerService cashDrawerService;

    @Mock
    private EscPosPrintingService printingService;

    @Mock
    private PdfService pdfService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private CashDrawerController controller;

    private LocalDate testDate;

    @BeforeEach
    void setUp() {
        testDate = LocalDate.of(2026, 9, 18);
        lenient().when(authentication.getName()).thenReturn("testuser");
    }

    @Test
    @DisplayName("getStatus - returns 200 with cash drawer status")
    void testGetStatus() {
        CashDrawerStatusDTO status = new CashDrawerStatusDTO(
                true,
                null,
                new BigDecimal("150.00"),
                new BigDecimal("300.00"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("450.00"),
                0
        );

        when(cashDrawerService.getStatus(testDate)).thenReturn(status);

        ResponseEntity<CashDrawerStatusDTO> response = controller.getStatus(testDate);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().currentTheoreticalCash()).isEqualByComparingTo("450.00");
    }

    @Test
    @DisplayName("openDrawer - returns 200 with created session")
    void testOpenDrawer() {
        CashDrawerOpenRequestDTO req = new CashDrawerOpenRequestDTO(new BigDecimal("150.00"), null, "Morning opening");
        CashDrawerSessionDTO sessionDTO = new CashDrawerSessionDTO(
                1L,
                testDate,
                CashDrawerSessionStatus.OPEN,
                testDate.atTime(9, 0),
                null,
                null,
                null,
                new BigDecimal("150.00"),
                null,
                "Morning opening",
                testDate.atTime(9, 0),
                testDate.atTime(9, 0)
        );

        when(cashDrawerService.openDrawer(eq(req), eq("testuser"))).thenReturn(sessionDTO);

        ResponseEntity<CashDrawerSessionDTO> response = controller.openDrawer(req, authentication);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(CashDrawerSessionStatus.OPEN);
    }

    @Test
    @DisplayName("recordMovement - returns 200 with recorded movement")
    void testRecordMovement() {
        CashMovementRequestDTO req = new CashMovementRequestDTO(CashMovementType.CASH_DROP, new BigDecimal("50.00"), "Safe drop", "REF1");
        CashMovementDTO movementDTO = new CashMovementDTO(
                10L,
                1L,
                testDate,
                CashMovementType.CASH_DROP,
                new BigDecimal("50.00"),
                "Safe drop",
                "REF1",
                null,
                testDate.atTime(15, 0),
                testDate.atTime(15, 0),
                testDate.atTime(15, 0)
        );

        when(cashDrawerService.recordMovement(eq(req), eq("testuser"))).thenReturn(movementDTO);

        ResponseEntity<CashMovementDTO> response = controller.recordMovement(req, authentication);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().type()).isEqualTo(CashMovementType.CASH_DROP);
    }

    @Test
    @DisplayName("getMovements - returns 200 with list of movements")
    void testGetMovements() {
        CashMovementDTO movementDTO = new CashMovementDTO(
                10L,
                1L,
                testDate,
                CashMovementType.CASH_IN,
                new BigDecimal("50.00"),
                "Initial float addition",
                null,
                null,
                testDate.atTime(10, 0),
                testDate.atTime(10, 0),
                testDate.atTime(10, 0)
        );

        when(cashDrawerService.getMovements(testDate)).thenReturn(List.of(movementDTO));

        ResponseEntity<List<CashMovementDTO>> response = controller.getMovements(testDate);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    @DisplayName("getXReport - returns 200 with intermediate X-Report DTO")
    void testGetXReport() {
        XReportDTO report = new XReportDTO(
                testDate,
                testDate.atTime(16, 0),
                "testuser",
                null,
                new BigDecimal("800.00"),
                new BigDecimal("960.00"),
                List.of(),
                List.of(),
                new BigDecimal("150.00"),
                new BigDecimal("200.00"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("350.00"),
                List.of()
        );

        when(cashDrawerService.getXReport(eq(testDate), eq("testuser"))).thenReturn(report);

        ResponseEntity<XReportDTO> response = controller.getXReport(testDate, authentication);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalRevenueTTC()).isEqualByComparingTo("960.00");
    }

    @Test
    @DisplayName("getXReportPdf - returns 200 with binary PDF")
    void testGetXReportPdf() {
        XReportDTO report = new XReportDTO(
                testDate,
                testDate.atTime(16, 0),
                "testuser",
                null,
                new BigDecimal("800.00"),
                new BigDecimal("960.00"),
                List.of(),
                List.of(),
                new BigDecimal("150.00"),
                new BigDecimal("200.00"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("350.00"),
                List.of()
        );

        byte[] pdfBytes = "DUMMY-PDF-CONTENT".getBytes();
        when(cashDrawerService.getXReport(eq(testDate), eq("testuser"))).thenReturn(report);
        when(pdfService.generateXReportPdf(report)).thenReturn(pdfBytes);

        ResponseEntity<byte[]> response = controller.getXReportPdf(testDate, authentication);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo(pdfBytes);
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
    }

    @Test
    @DisplayName("printXReport - returns 200 with print result")
    void testPrintXReport() {
        PrintResultDTO printResult = PrintResultDTO.success(PrinterRole.CASH_DESK, "192.168.1.103", 9100, "80mm slip printed");
        when(cashDrawerService.resolveDate(testDate)).thenReturn(testDate);
        when(printingService.printXReportTicket(eq(testDate), eq("testuser"))).thenReturn(printResult);

        ResponseEntity<PrintResultDTO> response = controller.printXReport(testDate, authentication);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isTrue();
    }

    @Test
    @DisplayName("printTillOpeningSlip - returns 200 with print result")
    void testPrintTillOpeningSlip() {
        PrintResultDTO printResult = PrintResultDTO.success(PrinterRole.CASH_DESK, "192.168.1.103", 9100, "Opening slip printed");
        when(printingService.printTillOpeningSlip(1L)).thenReturn(printResult);

        ResponseEntity<PrintResultDTO> response = controller.printTillOpeningSlip(1L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isTrue();
    }

    @Test
    @DisplayName("printCashMovementSlip - returns 200 with print result")
    void testPrintCashMovementSlip() {
        PrintResultDTO printResult = PrintResultDTO.success(PrinterRole.CASH_DESK, "192.168.1.103", 9100, "Movement slip printed");
        when(printingService.printCashMovementSlip(10L)).thenReturn(printResult);

        ResponseEntity<PrintResultDTO> response = controller.printCashMovementSlip(10L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isTrue();
    }
}
