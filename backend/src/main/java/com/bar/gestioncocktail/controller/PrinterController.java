package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PrintResultDTO;
import com.bar.gestioncocktail.dto.PrinterConnectionTestRequest;
import com.bar.gestioncocktail.dto.PrinterStatusDTO;
import com.bar.gestioncocktail.model.PrinterRole;
import com.bar.gestioncocktail.service.printing.EscPosPrintingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for direct ESC/POS thermal printer management, connectivity diagnostics,
 * order ticket dispatching, receipt printing, and cash drawer kicking.
 */
@RestController
@RequestMapping("/api/printers")
@Tag(name = "Printers", description = "Direct ESC/POS network thermal printing management and dispatch")
public class PrinterController {

    private final EscPosPrintingService printingService;

    /**
     * Constructs the controller with the printing orchestrator service.
     *
     * @param printingService ESC/POS printing service
     */
    public PrinterController(EscPosPrintingService printingService) {
        this.printingService = printingService;
    }

    /**
     * Retrieves current LAN printer configuration and status.
     *
     * @return Status DTO
     */
    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get configured printer network status", description = "Retrieves configured printer IPs, port, and direct printing status")
    @ApiResponse(responseCode = "200", description = "Printer configuration status returned successfully")
    public ResponseEntity<PrinterStatusDTO> getStatus() {
        return ResponseEntity.ok(printingService.getPrinterStatus());
    }

    /**
     * Dispatches a test ticket to the configured printer for the given role.
     *
     * @param role Target printer role (BAR, KITCHEN, CASH_DESK)
     * @return Execution result report
     */
    @PostMapping("/test/{role}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Test print to role printer", description = "Dispatches a test ticket to the configured printer for the given role (BAR, KITCHEN, CASH_DESK)")
    @ApiResponse(responseCode = "200", description = "Test print executed with connectivity report")
    public ResponseEntity<PrintResultDTO> testPrintRole(@PathVariable PrinterRole role) {
        return ResponseEntity.ok(printingService.printTestTicket(role));
    }

    /**
     * Tests a raw network printer socket connection to an arbitrary IP and port.
     *
     * @param request Connection test parameters
     * @return Execution result report
     */
    @PostMapping("/test-connection")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Test raw network printer connection", description = "Sends a test print ticket to an arbitrary LAN IP address and port")
    @ApiResponse(responseCode = "200", description = "Test connection executed with result")
    @ApiResponse(responseCode = "400", description = "Invalid connection parameters")
    public ResponseEntity<PrintResultDTO> testConnection(@Valid @RequestBody PrinterConnectionTestRequest request) {
        PrinterRole role = request.role() != null ? request.role() : PrinterRole.BAR;
        int port = request.port() != null ? request.port() : 9100;
        return ResponseEntity.ok(printingService.testConnection(request.ip(), port, role));
    }

    /**
     * Dispatches order preparation tickets to the bar and kitchen printers according to item routing.
     *
     * @param orderId Identifier of the order to dispatch
     * @return List of dispatch results per targeted workstation
     */
    @PostMapping("/orders/{orderId}/dispatch")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR', 'BARMAN')")
    @Operation(summary = "Dispatch order tickets to preparation printers", description = "Dispatches order items to bar and kitchen printers according to preparation station routing")
    @ApiResponse(responseCode = "200", description = "Order dispatched to relevant printers")
    @ApiResponse(responseCode = "404", description = "Order not found")
    public ResponseEntity<List<PrintResultDTO>> dispatchOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(printingService.dispatchOrder(orderId));
    }

    /**
     * Prints an invoice receipt on the cash desk printer.
     *
     * @param invoiceId Identifier of the invoice
     * @param openCashDrawer Whether to also pulse the cash drawer kick
     * @return Execution result report
     */
    @PostMapping("/invoices/{invoiceId}/receipt")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "Print invoice receipt to cash desk printer", description = "Formats and sends customer thermal receipt to cash desk printer and optionally kicks cash drawer")
    @ApiResponse(responseCode = "200", description = "Receipt sent to printer")
    @ApiResponse(responseCode = "404", description = "Invoice not found")
    public ResponseEntity<PrintResultDTO> printInvoiceReceipt(
            @PathVariable Long invoiceId,
            @RequestParam(defaultValue = "false") boolean openCashDrawer) {
        return ResponseEntity.ok(printingService.printInvoiceReceipt(invoiceId, openCashDrawer));
    }

    /**
     * Triggers a cash drawer kick pulse command on the cash desk printer.
     *
     * @return Execution result report
     */
    @PostMapping("/cash-drawer/open")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SERVEUR')")
    @Operation(summary = "Pulse cash drawer kick command", description = "Sends ESC p pulse command to cash desk printer to pop cash drawer")
    @ApiResponse(responseCode = "200", description = "Cash drawer pulse signal sent")
    public ResponseEntity<PrintResultDTO> openCashDrawer() {
        return ResponseEntity.ok(printingService.openCashDrawer());
    }

    /**
     * Prints an official Z-report register closure receipt to the cash desk printer.
     *
     * @param closureId Identifier of the daily cash closure
     * @return Execution result report
     */
    @PostMapping("/z-report/{closureId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Print Z-report receipt to cash desk printer", description = "Formats and transmits 80mm Z-report closure ticket to cash desk printer")
    @ApiResponse(responseCode = "200", description = "Z-report printed successfully")
    @ApiResponse(responseCode = "404", description = "Daily cash closure not found")
    public ResponseEntity<PrintResultDTO> printZReport(@PathVariable Long closureId) {
        return ResponseEntity.ok(printingService.printZReportTicket(closureId));
    }
}

