package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.service.payment.OnlinePaymentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PublicPaymentController}.
 */
@ExtendWith(MockitoExtension.class)
class PublicPaymentControllerTest {

    @Mock
    private OnlinePaymentService onlinePaymentService;

    @InjectMocks
    private PublicPaymentController controller;

    @Test
    @DisplayName("getTableBill - returns 200 OK with live table bill breakdown")
    void getTableBill_success() {
        TableBillSummaryResponseDTO expected = new TableBillSummaryResponseDTO(
                10L,
                4,
                2,
                List.of(
                        new TableAdditionItemDTO(1L, 101L, 201L, "Mojito", null, 2, BigDecimal.valueOf(10.0), BigDecimal.valueOf(20.0), BigDecimal.valueOf(16.67), BigDecimal.valueOf(3.33), "20%"),
                        new TableAdditionItemDTO(2L, 101L, 202L, "Spritz", null, 1, BigDecimal.valueOf(10.0), BigDecimal.valueOf(10.0), BigDecimal.valueOf(8.33), BigDecimal.valueOf(1.67), "20%")
                ),
                BigDecimal.valueOf(25.0),
                BigDecimal.valueOf(5.0),
                BigDecimal.valueOf(30.0),
                BigDecimal.valueOf(10.0),
                BigDecimal.valueOf(20.0),
                false,
                List.of(),
                List.of(),
                BigDecimal.ZERO,
                true,
                "SANDBOX",
                null
        );

        when(onlinePaymentService.getTableBillSummary(10L, "Alex")).thenReturn(expected);

        ResponseEntity<TableBillSummaryResponseDTO> response = controller.getTableBill(10L, "Alex");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().tableId()).isEqualTo(10L);
        assertThat(response.getBody().remainingBalance()).isEqualTo(BigDecimal.valueOf(20.0));
        assertThat(response.getBody().paymentProvider()).isEqualTo("SANDBOX");
    }

    @Test
    @DisplayName("createPaymentIntent - initializes payment and returns 201 Created")
    void createPaymentIntent_success() {
        PaymentIntentRequestDTO request = new PaymentIntentRequestDTO(
                BigDecimal.valueOf(20.0),
                BigDecimal.valueOf(2.0),
                "TOTALITE",
                "Alex",
                null,
                "idemp-key-001",
                false,
                "alex@example.com"
        );

        PaymentIntentResponseDTO expected = new PaymentIntentResponseDTO(
                "tx_sim_001",
                "secret_sim_001",
                BigDecimal.valueOf(20.0),
                BigDecimal.valueOf(2.0),
                BigDecimal.valueOf(22.0),
                "EUR",
                "SANDBOX",
                null
        );

        when(onlinePaymentService.createPaymentIntent(10L, request)).thenReturn(expected);

        ResponseEntity<PaymentIntentResponseDTO> response = controller.createPaymentIntent(10L, request);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().transactionId()).isEqualTo("tx_sim_001");
        assertThat(response.getBody().totalCharged()).isEqualTo(BigDecimal.valueOf(22.0));
    }

    @Test
    @DisplayName("confirmSandboxPayment - settles simulator transaction and returns 200 OK")
    void confirmSandboxPayment_success() {
        ConfirmSandboxPaymentRequestDTO request = new ConfirmSandboxPaymentRequestDTO(
                "tx_sim_001",
                "secret_sim_001",
                "card"
        );

        PaymentSuccessResponseDTO expected = new PaymentSuccessResponseDTO(
                "tx_sim_001",
                55L,
                88L,
                "SUCCEEDED",
                BigDecimal.valueOf(20.0),
                BigDecimal.valueOf(2.0),
                BigDecimal.valueOf(22.0),
                BigDecimal.ZERO,
                true,
                true,
                "/api/public/tables/10/payments/tx_sim_001/receipt.pdf"
        );

        when(onlinePaymentService.confirmSandboxPayment(10L, request)).thenReturn(expected);

        ResponseEntity<PaymentSuccessResponseDTO> response = controller.confirmSandboxPayment(10L, request);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo("SUCCEEDED");
        assertThat(response.getBody().isTableLiberated()).isTrue();
    }

    @Test
    @DisplayName("liberateTable - frees settled table and returns 200 OK")
    void liberateTable_success() {
        when(onlinePaymentService.liberateTableIfSettled(10L)).thenReturn(true);

        ResponseEntity<Map<String, Object>> response = controller.liberateTable(10L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).containsEntry("liberated", true);
    }
}
