package com.bar.gestioncocktail.service.payment;

import java.math.BigDecimal;

/**
 * Result data returned by a payment gateway provider when preparing a payment transaction.
 *
 * @param transactionId Unique gateway transaction or PaymentIntent ID
 * @param clientSecret Client secret for client SDK initialization or confirmation
 * @param amount Base settled amount
 * @param tip Tip amount
 * @param totalCharged Total amount charged to the patron
 * @param currency Transaction currency code
 * @param provider Provider identifier ('STRIPE', 'SANDBOX')
 * @param publishableKey Gateway publishable key for client SDK
 */
public record PaymentIntentResult(
        String transactionId,
        String clientSecret,
        BigDecimal amount,
        BigDecimal tip,
        BigDecimal totalCharged,
        String currency,
        String provider,
        String publishableKey
) {}
