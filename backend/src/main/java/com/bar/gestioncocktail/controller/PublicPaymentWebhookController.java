package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.service.monetization.StripeTerminalConnectService;
import com.bar.gestioncocktail.service.payment.OnlinePaymentService;
import com.bar.gestioncocktail.service.payment.PaymentWebhookResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final StripeTerminalConnectService stripeTerminalConnectService;

    /**
     * Backward-compatible constructor injection for unit tests.
     *
     * @param onlinePaymentService Online payment management service
     */
    public PublicPaymentWebhookController(OnlinePaymentService onlinePaymentService) {
        this(onlinePaymentService, null);
    }

    /**
     * Constructor injection with Stripe Connect terminal & billing webhook service.
     *
     * @param onlinePaymentService         Online payment management service
     * @param stripeTerminalConnectService Stripe Connect terminal & billing webhook handler
     */
    @Autowired
    public PublicPaymentWebhookController(
            OnlinePaymentService onlinePaymentService,
            StripeTerminalConnectService stripeTerminalConnectService) {
        this.onlinePaymentService = onlinePaymentService;
        this.stripeTerminalConnectService = stripeTerminalConnectService;
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

    /**
     * Handles incoming Stripe Connect & Billing webhook events for Option 3 Stripe Terminal
     * {@code card_present} payments and Option 1 commission invoice settlement events.
     *
     * @param payload   Raw JSON event payload
     * @param sigHeader Stripe-Signature header
     * @return Acknowledgment response
     */
    @PostMapping("/connect")
    @Operation(summary = "Receive Stripe Connect & Billing webhooks",
               description = "Validates Stripe Connect webhook signature and processes Terminal Connect intents or Option 1 commission invoices.")
    @ApiResponse(responseCode = "200", description = "Connect webhook processed successfully")
    @ApiResponse(responseCode = "400", description = "Invalid signature or payload")
    public ResponseEntity<Map<String, Object>> handleStripeConnectWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader
    ) {
        if (stripeTerminalConnectService == null) {
            return ResponseEntity.internalServerError().build();
        }
        PaymentWebhookResult result = stripeTerminalConnectService.handleStripeConnectWebhook(payload, sigHeader);
        return ResponseEntity.ok(Map.of(
                "received", true,
                "status", result.status(),
                "transactionId", result.transactionId() != null ? result.transactionId() : ""
        ));
    }
}
