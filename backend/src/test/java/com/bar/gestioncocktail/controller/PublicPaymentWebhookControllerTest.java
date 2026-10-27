package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.service.payment.OnlinePaymentService;
import com.bar.gestioncocktail.service.payment.PaymentWebhookResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PublicPaymentWebhookController}.
 */
@ExtendWith(MockitoExtension.class)
class PublicPaymentWebhookControllerTest {

    @Mock
    private OnlinePaymentService onlinePaymentService;

    @InjectMocks
    private PublicPaymentWebhookController controller;

    @Test
    @DisplayName("handleStripeWebhook - processes valid webhook and returns 200 OK")
    void handleStripeWebhook_nominal_returns200() {
        PaymentWebhookResult mockResult = new PaymentWebhookResult(
                "pi_stripe_123",
                "SUCCEEDED",
                "card",
                BigDecimal.valueOf(25.0),
                "EUR",
                "patron@example.com"
        );

        when(onlinePaymentService.handleStripeWebhook("{\"type\":\"payment_intent.succeeded\"}", "test_sig"))
                .thenReturn(mockResult);

        ResponseEntity<Map<String, Object>> response = controller.handleStripeWebhook(
                "{\"type\":\"payment_intent.succeeded\"}",
                "test_sig"
        );

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("received")).isEqualTo(true);
        assertThat(response.getBody().get("status")).isEqualTo("SUCCEEDED");
        assertThat(response.getBody().get("transactionId")).isEqualTo("pi_stripe_123");
    }
}
