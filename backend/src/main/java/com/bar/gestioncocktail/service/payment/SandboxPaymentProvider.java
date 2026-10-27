package com.bar.gestioncocktail.service.payment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Built-in Sandbox / Demo payment gateway provider for local, offline, or test environments.
 * Generates cryptographically unique mock transaction references and client secrets,
 * allowing instant payment simulation (Apple Pay, Google Pay, Credit Card) without live Stripe keys.
 */
@Component
public class SandboxPaymentProvider implements PaymentGatewayProvider {

    private static final Logger log = LoggerFactory.getLogger(SandboxPaymentProvider.class);
    public static final String PROVIDER_NAME = "SANDBOX";

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    @Override
    public PaymentIntentResult createPaymentIntent(
            Long tableId,
            BigDecimal amount,
            BigDecimal tip,
            String currency,
            String idempotencyKey,
            String guestName,
            String typeSplit
    ) {
        BigDecimal total = amount.add(tip != null ? tip : BigDecimal.ZERO);
        String txId = "sandbox_pi_" + UUID.nameUUIDFromBytes((idempotencyKey + "_" + tableId).getBytes()).toString().replace("-", "").substring(0, 20);
        String clientSecret = "sandbox_sec_" + UUID.randomUUID().toString().replace("-", "");

        log.info("Created Sandbox PaymentIntent {} for table {} - Total: {} {}", txId, tableId, total, currency);

        return new PaymentIntentResult(
                txId,
                clientSecret,
                amount,
                tip != null ? tip : BigDecimal.ZERO,
                total,
                currency != null ? currency.toUpperCase() : "EUR",
                PROVIDER_NAME,
                null
        );
    }

    @Override
    public PaymentWebhookResult parseAndVerifyWebhook(String payload, String signatureHeader) {
        // In sandbox simulation, parse simple test payloads
        log.info("Processing Sandbox webhook event: {}", payload);
        return new PaymentWebhookResult(
                "sandbox_test",
                "SUCCEEDED",
                "card",
                BigDecimal.ZERO,
                "EUR",
                "patron@openbar.local"
        );
    }
}
