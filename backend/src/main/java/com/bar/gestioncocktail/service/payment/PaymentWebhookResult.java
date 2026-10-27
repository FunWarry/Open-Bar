package com.bar.gestioncocktail.service.payment;

import java.math.BigDecimal;

/**
 * Result representation of an asynchronous payment gateway event or webhook notification.
 *
 * @param transactionId Unique gateway transaction or PaymentIntent reference
 * @param status Outcome status ('SUCCEEDED', 'FAILED', 'IGNORED')
 * @param paymentMethodType Payment method used (e.g. 'card', 'apple_pay', 'google_pay')
 * @param amount Amount settled
 * @param currency Currency code
 * @param customerEmail Patron email address if present
 */
public record PaymentWebhookResult(
        String transactionId,
        String status,
        String paymentMethodType,
        BigDecimal amount,
        String currency,
        String customerEmail
) {}
