package com.bar.gestioncocktail.service.payment;

import java.math.BigDecimal;

/**
 * Pluggable payment gateway provider interface supporting external payment processors (e.g. Stripe)
 * and offline/local development simulations (Sandbox).
 */
public interface PaymentGatewayProvider {

    /**
     * Unique identifier of this provider (e.g. 'STRIPE', 'SANDBOX').
     *
     * @return Provider identifier string
     */
    String getProviderName();

    /**
     * Checks whether this provider is currently available and configured with necessary keys.
     *
     * @return True if available, false otherwise
     */
    boolean isAvailable();

    /**
     * Initiates a payment intent or transaction on the gateway.
     *
     * @param tableId Physical table ID
     * @param amount Base amount to pay (excluding tip)
     * @param tip Tip amount
     * @param currency Transaction currency code (e.g. 'EUR')
     * @param idempotencyKey Client-supplied unique idempotency UUID
     * @param guestName Optional patron nickname
     * @param typeSplit Settlement split mode
     * @return Prepared payment intent result
     */
    PaymentIntentResult createPaymentIntent(
            Long tableId,
            BigDecimal amount,
            BigDecimal tip,
            String currency,
            String idempotencyKey,
            String guestName,
            String typeSplit
    );

    /**
     * Parses and cryptographically verifies an incoming webhook payload from the provider.
     *
     * @param payload Raw HTTP request body
     * @param signatureHeader Cryptographic signature header (e.g. 'Stripe-Signature')
     * @return Verified webhook outcome
     */
    PaymentWebhookResult parseAndVerifyWebhook(String payload, String signatureHeader);
}
