package com.bar.gestioncocktail.service.payment;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link SandboxPaymentProvider}.
 */
class SandboxPaymentProviderTest {

    private SandboxPaymentProvider provider;

    @BeforeEach
    void setUp() {
        provider = new SandboxPaymentProvider();
    }

    @Test
    @DisplayName("getProviderName - returns SANDBOX")
    void getProviderName_returnsSandbox() {
        assertEquals("SANDBOX", provider.getProviderName());
    }

    @Test
    @DisplayName("isAvailable - always returns true for sandbox provider")
    void isAvailable_alwaysTrue() {
        assertTrue(provider.isAvailable());
    }

    @Test
    @DisplayName("createPaymentIntent - generates valid mock transaction and secret")
    void createPaymentIntent_nominal_returnsResult() {
        PaymentIntentResult result = provider.createPaymentIntent(
                10L,
                BigDecimal.valueOf(25.0),
                BigDecimal.valueOf(2.5),
                "EUR",
                "idemp-123",
                "Alex",
                "TOTALITE"
        );

        assertNotNull(result);
        assertTrue(result.transactionId().startsWith("sandbox_pi_"));
        assertTrue(result.clientSecret().startsWith("sandbox_sec_"));
        assertEquals(BigDecimal.valueOf(25.0), result.amount());
        assertEquals(BigDecimal.valueOf(2.5), result.tip());
        assertEquals(BigDecimal.valueOf(27.5), result.totalCharged());
        assertEquals("EUR", result.currency());
        assertEquals("SANDBOX", result.provider());
    }

    @Test
    @DisplayName("parseAndVerifyWebhook - parses mock webhook payload successfully")
    void parseAndVerifyWebhook_returnsMockResult() {
        PaymentWebhookResult result = provider.parseAndVerifyWebhook("{\"type\": \"test\"}", "dummy-sig");

        assertNotNull(result);
        assertEquals("sandbox_test", result.transactionId());
        assertEquals("SUCCEEDED", result.status());
        assertEquals("card", result.paymentMethodType());
        assertEquals("EUR", result.currency());
    }
}
