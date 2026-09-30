package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.service.tpe.PaymentTerminalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for physical and simulated card payment terminal (TPE) operations.
 */
@RestController
@RequestMapping("/api/tpe")
@Tag(name = "Payment Terminals (TPE)", description = "Operations for local payment terminals via Concert / CB IP protocol")
public class TpeController {

    private final PaymentTerminalService paymentTerminalService;

    /**
     * Constructor injection.
     *
     * @param paymentTerminalService TPE transaction and hardware communication service
     */
    public TpeController(PaymentTerminalService paymentTerminalService) {
        this.paymentTerminalService = paymentTerminalService;
    }

    /**
     * Dispatches an electronic payment amount to a configured payment terminal.
     *
     * @param request Payment parameters
     * @return Initialized transaction response with tracking UUID
     */
    @PostMapping("/pay")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Dispatch card payment to terminal", description = "Initiates an asynchronous card payment transaction on the targeted TPE")
    @ApiResponse(responseCode = "200", description = "Transaction successfully dispatched to terminal")
    @ApiResponse(responseCode = "400", description = "Invalid request payload or terminal not configured")
    @ApiResponse(responseCode = "403", description = "Access denied or module disabled")
    public ResponseEntity<TpePaymentResponseDTO> initiatePayment(@Valid @RequestBody TpePaymentRequestDTO request) {
        TpePaymentResponseDTO response = paymentTerminalService.initiatePayment(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Cancels an ongoing card payment transaction on the terminal.
     *
     * @param transactionId Unique transaction tracking UUID
     * @return Updated transaction status marked as CANCELLED
     */
    @PostMapping("/cancel/{transactionId}")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Cancel transaction in progress", description = "Aborts an active in-flight payment transaction on the physical terminal")
    @ApiResponse(responseCode = "200", description = "Transaction cancelled")
    @ApiResponse(responseCode = "404", description = "Transaction not found")
    public ResponseEntity<TpePaymentResponseDTO> cancelPayment(
            @Parameter(description = "Transaction UUID", required = true) @PathVariable String transactionId) {
        TpePaymentResponseDTO response = paymentTerminalService.cancelPayment(transactionId);
        return ResponseEntity.ok(response);
    }

    /**
     * Queries the current status of an ongoing or completed transaction.
     *
     * @param transactionId Unique transaction tracking UUID
     * @return Current transaction status
     */
    @GetMapping("/status/{transactionId}")
    @PreAuthorize("hasAnyRole('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Get transaction status", description = "Retrieves the current lifecycle state of a payment transaction")
    @ApiResponse(responseCode = "200", description = "Status retrieved")
    @ApiResponse(responseCode = "404", description = "Transaction not found")
    public ResponseEntity<TpePaymentResponseDTO> getStatus(
            @Parameter(description = "Transaction UUID", required = true) @PathVariable String transactionId) {
        TpePaymentResponseDTO response = paymentTerminalService.getTransactionStatus(transactionId);
        return ResponseEntity.ok(response);
    }

    /**
     * Tests TCP socket connectivity and handshaking to a payment terminal.
     *
     * @param request Test connection parameters
     * @return Connectivity outcome and latency report
     */
    @PostMapping("/test-connection")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Test terminal connection", description = "Performs a TCP probe and Concert handshake test against the terminal")
    @ApiResponse(responseCode = "200", description = "Test completed")
    @ApiResponse(responseCode = "403", description = "Access denied or module disabled")
    public ResponseEntity<TpeConnectionTestResponseDTO> testConnection(@Valid @RequestBody TpeConnectionTestRequestDTO request) {
        TpeConnectionTestResponseDTO response = paymentTerminalService.testConnection(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves public terminal configuration and availability for client workstations.
     *
     * @return Public TPE configuration
     */
    @GetMapping("/config")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get public TPE configuration", description = "Returns terminal availability, configured stations, and demo simulator status")
    @ApiResponse(responseCode = "200", description = "Public configuration retrieved")
    public ResponseEntity<TpePublicConfigDTO> getConfig() {
        TpePublicConfigDTO config = paymentTerminalService.getPublicConfig();
        return ResponseEntity.ok(config);
    }
}
