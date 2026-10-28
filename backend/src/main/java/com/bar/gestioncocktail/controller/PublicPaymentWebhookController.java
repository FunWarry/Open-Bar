package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.service.payment.OnlinePaymentService;
import com.bar.gestioncocktail.service.payment.PaymentWebhookResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Public REST controller receiving asynchronous webhook callbacks from external payment gateways (e.g. Stripe).
 * Cryptographically verifies signatures before updating transaction statuses and table invoices.
 */
@RestController
@RequestMapping("/api/public/payments/webhook")
@Tag(name = "Payment Webhooks", description = "Public webhook receivers for external payment providers")
public class PublicPaymentWebhookController {

    private final OnlinePaymentService onlinePaymentService;

    /**
     * Constructor injection.
     *
     * @param onlinePaymentService Online payment management service
     */
    public PublicPaymentWebhookController(OnlinePaymentService onlinePaymentService) {
        this.onlinePaymentService = onlinePaymentService;
    }

    /**
     * Handles incoming Stripe webhook events with HMAC-SHA256 signature verification.
     *
     * @param payload Raw JSON event payload
     * @param sigHeader Stripe-Signature header
     * @return Acknowledgment response
     */
    @PostMapping
    @Operation(summary = "Receive Stripe webhook events",
               description = "Validates cryptographic signature and confirms successful payment intents.")
    @ApiResponse(responseCode = "200", description = "Webhook received and verified successfully")
    @ApiResponse(responseCode = "400", description = "Invalid signature or payload")
    public ResponseEntity<Map<String, Object>> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader
    ) {
        PaymentWebhookResult result = onlinePaymentService.handleStripeWebhook(payload, sigHeader);
        return ResponseEntity.ok(Map.of(
                "received", true,
                "status", result.status(),
                "transactionId", result.transactionId() != null ? result.transactionId() : ""
        ));
    }
}
