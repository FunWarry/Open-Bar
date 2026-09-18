package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.CashDrawerOpenRequestDTO;
import com.bar.gestioncocktail.dto.CashDrawerSessionDTO;
import com.bar.gestioncocktail.dto.CashDrawerStatusDTO;
import com.bar.gestioncocktail.dto.CashMovementDTO;
import com.bar.gestioncocktail.dto.CashMovementRequestDTO;
import com.bar.gestioncocktail.dto.PrintResultDTO;
import com.bar.gestioncocktail.dto.XReportDTO;
import com.bar.gestioncocktail.service.CashDrawerService;
import com.bar.gestioncocktail.service.PdfService;
import com.bar.gestioncocktail.service.printing.EscPosPrintingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * REST controller managing physical cash drawer operations:
 * morning till opening with counted float, intra-day cash movements (in, drop, paid out),
 * intermediate X-reports, thermal ticket printing, and PDF export.
 */
@RestController
@RequestMapping("/api/cash-drawer")
@Tag(name = "Cash Drawer", description = "Physical cash drawer lifecycle, intra-day movements and X-reports")
public class CashDrawerController {

    private static final String DEFAULT_OPERATOR = "SYSTEM";

    private final CashDrawerService cashDrawerService;
    private final EscPosPrintingService printingService;
    private final PdfService pdfService;

    /**
     * Constructs the controller with required collaborator services.
     *
     * @param cashDrawerService Cash drawer management service
     * @param printingService Thermal ESC/POS printing service
     * @param pdfService PDF document generation service
     */
    public CashDrawerController(
            CashDrawerService cashDrawerService,
            EscPosPrintingService printingService,
            PdfService pdfService) {
        this.cashDrawerService = cashDrawerService;
        this.printingService = printingService;
        this.pdfService = pdfService;
    }

    /**
     * Retrieves the real-time cash drawer status and liquidity overview for an operational date.
     *
     * @param date Target date (optional, defaults to current date)
     * @return Status DTO
     */
    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN', 'SERVEUR')")
    @Operation(summary = "Get cash drawer status", description = "Retrieves whether the till is open, current float, revenue, cash in/out, and theoretical cash")
    @ApiResponse(responseCode = "200", description = "Cash drawer status retrieved successfully")
    public ResponseEntity<CashDrawerStatusDTO> getStatus(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(cashDrawerService.getStatus(date));
    }

    /**
     * Opens the physical cash drawer register for the day with a counted starting float.
     *
     * @param request Opening parameters and denomination breakdown
     * @param auth Current authenticated security context
     * @return Persisted cash drawer session
     */
    @PostMapping("/open")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "Open cash drawer till", description = "Records morning drawer opening with counted float and denomination breakdown")
    @ApiResponse(responseCode = "200", description = "Cash drawer session opened successfully")
    @ApiResponse(responseCode = "400", description = "Cash drawer already open or date already closed")
    public ResponseEntity<CashDrawerSessionDTO> openDrawer(
            @Valid @RequestBody CashDrawerOpenRequestDTO request,
            Authentication auth) {
        String username = auth != null ? auth.getName() : DEFAULT_OPERATOR;
        return ResponseEntity.ok(cashDrawerService.openDrawer(request, username));
    }

    /**
     * Logs an intra-day cash movement (Cash In, Cash Drop, or Paid Out) within the open drawer session.
     *
     * @param request Movement specifications
     * @param auth Current authenticated security context
     * @return Created cash movement record
     */
    @PostMapping("/movement")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "Record intra-day cash movement", description = "Logs a Cash In deposit, Cash Drop safe transfer, or Paid Out petty cash expense")
    @ApiResponse(responseCode = "200", description = "Cash movement recorded successfully")
    @ApiResponse(responseCode = "400", description = "Till not open, invalid movement or insufficient drawer cash")
    public ResponseEntity<CashMovementDTO> recordMovement(
            @Valid @RequestBody CashMovementRequestDTO request,
            Authentication auth) {
        String username = auth != null ? auth.getName() : DEFAULT_OPERATOR;
        return ResponseEntity.ok(cashDrawerService.recordMovement(request, username));
    }

    /**
     * Lists all intra-day cash movements logged for a given date.
     *
     * @param date Operational date (optional, defaults to current date)
     * @return List of cash movements
     */
    @GetMapping("/movements")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "List intra-day cash movements", description = "Returns all cash movements recorded for a given operational date")
    @ApiResponse(responseCode = "200", description = "Cash movements retrieved successfully")
    public ResponseEntity<List<CashMovementDTO>> getMovements(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(cashDrawerService.getMovements(date));
    }

    /**
     * Retrieves an intermediate, non-destructive X-Report (Rapport X) for mid-shift auditing.
     *
     * @param date Operational date (optional, defaults to current date)
     * @param auth Current authenticated security context
     * @return X-Report financial snapshot DTO
     */
    @GetMapping("/x-report")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "Get intermediate X-Report", description = "Provides a non-destructive mid-shift snapshot of revenue, payments, float, and theoretical cash")
    @ApiResponse(responseCode = "200", description = "X-Report generated successfully")
    public ResponseEntity<XReportDTO> getXReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        String username = auth != null ? auth.getName() : DEFAULT_OPERATOR;
        return ResponseEntity.ok(cashDrawerService.getXReport(date, username));
    }

    /**
     * Downloads an intermediate X-Report as an official A4 PDF document.
     *
     * @param date Operational date (optional, defaults to current date)
     * @param auth Current authenticated security context
     * @return PDF byte stream
     */
    @GetMapping(value = "/x-report/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "Download intermediate X-Report PDF", description = "Generates and downloads an A4 certified PDF document for the intermediate X-Report")
    @ApiResponse(responseCode = "200", description = "PDF binary stream returned successfully")
    public ResponseEntity<byte[]> getXReportPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        String username = auth != null ? auth.getName() : DEFAULT_OPERATOR;
        XReportDTO xReport = cashDrawerService.getXReport(date, username);
        byte[] pdf = pdfService.generateXReportPdf(xReport);

        String filename = "rapport-x-" + (xReport.reportDate() != null ? xReport.reportDate().format(DateTimeFormatter.ISO_DATE) : "courant") + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    /**
     * Prints the intermediate X-Report on the 80mm cash desk thermal printer.
     *
     * @param date Operational date (optional, defaults to current date)
     * @param auth Current authenticated security context
     * @return Print dispatch result report
     */
    @PostMapping("/x-report/print")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "Print intermediate X-Report", description = "Dispatches an 80mm intermediate X-Report ticket to the cash desk ESC/POS printer")
    @ApiResponse(responseCode = "200", description = "Print job dispatched successfully")
    public ResponseEntity<PrintResultDTO> printXReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        String username = auth != null ? auth.getName() : DEFAULT_OPERATOR;
        LocalDate resolvedDate = cashDrawerService.resolveDate(date);
        return ResponseEntity.ok(printingService.printXReportTicket(resolvedDate, username));
    }

    /**
     * Prints an official cash drawer opening audit slip on the thermal printer.
     *
     * @param sessionId Cash drawer session ID
     * @return Print dispatch result report
     */
    @PostMapping("/session/{sessionId}/print")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "Print till opening slip", description = "Prints an 80mm audit slip for a cash drawer opening")
    @ApiResponse(responseCode = "200", description = "Print job dispatched successfully")
    @ApiResponse(responseCode = "404", description = "Session not found")
    public ResponseEntity<PrintResultDTO> printTillOpeningSlip(@PathVariable Long sessionId) {
        return ResponseEntity.ok(printingService.printTillOpeningSlip(sessionId));
    }

    /**
     * Prints a cash movement audit slip on the thermal printer.
     *
     * @param movementId Cash movement ID
     * @return Print dispatch result report
     */
    @PostMapping("/movements/{movementId}/print")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'BARMAN')")
    @Operation(summary = "Print cash movement slip", description = "Prints an 80mm audit slip for an intra-day cash movement")
    @ApiResponse(responseCode = "200", description = "Print job dispatched successfully")
    @ApiResponse(responseCode = "404", description = "Cash movement not found")
    public ResponseEntity<PrintResultDTO> printCashMovementSlip(@PathVariable Long movementId) {
        return ResponseEntity.ok(printingService.printCashMovementSlip(movementId));
    }
}
