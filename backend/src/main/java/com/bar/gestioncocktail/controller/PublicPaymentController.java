package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.service.payment.OnlinePaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Public REST controller enabling seated table patrons to view addition breakdowns,
 * choose tips, initiate online payments (Stripe / Apple Pay / Google Pay / Sandbox),
 * settle split bills, download legal PDF receipts, and confirm table liberation.
 */
@RestController
@RequestMapping("/api/public/tables/{tableId}/payments")
@Tag(name = "Public Table Payments", description = "Patron mobile self-checkout and pay-at-table gateway endpoints")
public class PublicPaymentController {

    private final OnlinePaymentService onlinePaymentService;

    /**
     * Constructor injection.
     *
     * @param onlinePaymentService Online payment management service
     */
    public PublicPaymentController(OnlinePaymentService onlinePaymentService) {
        this.onlinePaymentService = onlinePaymentService;
    }

    /**
     * Retrieves the live bill breakdown, tax subtotals, already paid shares, and remaining balance for a table.
     *
     * @param tableId Scanned table identifier
     * @param guestName Optional nickname of the patron calling the endpoint
     * @return Comprehensive table bill breakdown DTO
     */
    @GetMapping("/bill")
    @Operation(summary = "Get table bill breakdown for mobile checkout",
               description = "Calculates total TTC, taxes, already settled payments, and remaining balance.")
    @ApiResponse(responseCode = "200", description = "Bill breakdown calculated successfully")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<TableBillSummaryResponseDTO> getTableBill(
            @Parameter(description = "Table identifier", example = "4") @PathVariable Long tableId,
            @Parameter(description = "Patron nickname for personal itemized breakdown") @RequestParam(required = false) String guestName
    ) {
        return ResponseEntity.ok(onlinePaymentService.getTableBillSummary(tableId, guestName));
    }

    /**
     * Creates a payment intent or transaction for paying the entire table bill or a split share.
     *
     * @param tableId Scanned table identifier
     * @param request Payment intent parameters (amount, tip, split mode, idempotency key)
     * @return Prepared payment intent response containing client secret
     */
    @PostMapping("/intent")
    @Operation(summary = "Create online payment intent",
               description = "Generates a Stripe PaymentIntent or Sandbox transaction with idempotency protection.")
    @ApiResponse(responseCode = "201", description = "Payment intent created successfully")
    @ApiResponse(responseCode = "400", description = "Validation error or requested amount exceeds remaining balance")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<PaymentIntentResponseDTO> createPaymentIntent(
            @Parameter(description = "Table identifier", example = "4") @PathVariable Long tableId,
            @Valid @RequestBody PaymentIntentRequestDTO request
    ) {
        PaymentIntentResponseDTO response = onlinePaymentService.createPaymentIntent(tableId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Confirms and settles a simulated sandbox payment (demo / offline mode).
     *
     * @param tableId Scanned table identifier
     * @param request Confirmation payload containing transaction ID and client secret
     * @return Payment confirmation DTO
     */
    @PostMapping("/confirm-sandbox")
    @Operation(summary = "Confirm simulated sandbox payment",
               description = "Executes immediate settlement in Sandbox simulation mode without external gateway.")
    @ApiResponse(responseCode = "200", description = "Payment simulated and settled successfully")
    @ApiResponse(responseCode = "400", description = "Invalid client secret or transaction")
    @ApiResponse(responseCode = "404", description = "Transaction not found")
    public ResponseEntity<PaymentSuccessResponseDTO> confirmSandboxPayment(
            @Parameter(description = "Table identifier", example = "4") @PathVariable Long tableId,
            @Valid @RequestBody ConfirmSandboxPaymentRequestDTO request
    ) {
        return ResponseEntity.ok(onlinePaymentService.confirmSandboxPayment(tableId, request));
    }

    /**
     * Confirms physical table departure and marks table free after full bill settlement.
     *
     * @param tableId Scanned table identifier
     * @return Success status map
     */
    @PostMapping("/liberate")
    @Operation(summary = "Confirm table liberation upon full payment",
               description = "Frees the table on the floor plan and broadcasts liberation event if balance is zero.")
    @ApiResponse(responseCode = "200", description = "Table liberated successfully")
    @ApiResponse(responseCode = "400", description = "Bill is not fully settled")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<Map<String, Object>> liberateTable(
            @Parameter(description = "Table identifier", example = "4") @PathVariable Long tableId
    ) {
        boolean liberated = onlinePaymentService.liberateTableIfSettled(tableId);
        return ResponseEntity.ok(Map.of("tableId", tableId, "liberated", liberated));
    }

    /**
     * Downloads the official legal PDF receipt for a completed transaction.
     *
     * @param tableId Scanned table identifier
     * @param transactionId Transaction identifier
     * @return PDF binary byte array
     */
    @GetMapping("/{transactionId}/receipt.pdf")
    @Operation(summary = "Download digital payment receipt PDF",
               description = "Generates and streams legal A4 PDF receipt compliant with fiscal standards.")
    @ApiResponse(responseCode = "200", description = "PDF receipt generated")
    @ApiResponse(responseCode = "404", description = "Transaction or invoice not found")
    public ResponseEntity<byte[]> downloadReceiptPdf(
            @Parameter(description = "Table identifier", example = "4") @PathVariable Long tableId,
            @Parameter(description = "Transaction reference", example = "pi_12345") @PathVariable String transactionId
    ) {
        byte[] pdfBytes = onlinePaymentService.generateReceiptPdf(transactionId);
        String safeTxId = transactionId != null ? transactionId.replaceAll("[^a-zA-Z0-9_-]", "") : "receipt";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"recu-" + safeTxId + ".pdf\"")
                .body(pdfBytes);
    }

    /**
     * Dispatches the invoice PDF receipt to the patron's email address.
     *
     * @param tableId Scanned table identifier
     * @param transactionId Transaction identifier
     * @param request Recipient email payload
     * @return Status map
     */
    @PostMapping("/{transactionId}/receipt-email")
    @Operation(summary = "Send digital receipt via email",
               description = "Sends the legal PDF receipt to the requested customer email address.")
    @ApiResponse(responseCode = "200", description = "Email dispatch processed")
    @ApiResponse(responseCode = "404", description = "Transaction not found")
    public ResponseEntity<Map<String, Object>> sendReceiptEmail(
            @Parameter(description = "Table identifier", example = "4") @PathVariable Long tableId,
            @Parameter(description = "Transaction reference", example = "pi_12345") @PathVariable String transactionId,
            @Valid @RequestBody SendReceiptEmailRequestDTO request
    ) {
        boolean sent = onlinePaymentService.sendReceiptEmail(transactionId, request.email());
        return ResponseEntity.ok(Map.of("transactionId", transactionId, "sent", sent));
    }
}
