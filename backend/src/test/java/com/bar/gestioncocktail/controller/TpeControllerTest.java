package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.TpeConnectionTestRequestDTO;
import com.bar.gestioncocktail.dto.TpeConnectionTestResponseDTO;
import com.bar.gestioncocktail.dto.TpePaymentRequestDTO;
import com.bar.gestioncocktail.dto.TpePaymentResponseDTO;
import com.bar.gestioncocktail.dto.TpePublicConfigDTO;
import com.bar.gestioncocktail.model.TpeTerminalRole;
import com.bar.gestioncocktail.model.TpeTransactionStatus;
import com.bar.gestioncocktail.service.tpe.PaymentTerminalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link TpeController} validating REST endpoints for TPE payment dispatch,
 * cancellation, status retrieval, connection diagnostics, and configuration.
 */
@ExtendWith(MockitoExtension.class)
class TpeControllerTest {

    @Mock
    private PaymentTerminalService paymentTerminalService;

    @InjectMocks
    private TpeController tpeController;

    private TpePaymentResponseDTO sampleResponse;

    @BeforeEach
    void setUp() {
        sampleResponse = new TpePaymentResponseDTO(
                "tx-9876",
                TpeTransactionStatus.APPROVED,
                new BigDecimal("23.50"),
                "EUR",
                "AUTH7788",
                "POS01",
                "CB",
                "4970XXXXXXXX1234",
                "001",
                "Payment approved",
                LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("initiatePayment returns 200 OK with TpePaymentResponseDTO")
    void initiatePayment_returns200() {
        TpePaymentRequestDTO request = new TpePaymentRequestDTO(
                new BigDecimal("23.50"),
                "EUR",
                TpeTerminalRole.BAR,
                null,
                null,
                "Alex"
        );

        when(paymentTerminalService.initiatePayment(request)).thenReturn(sampleResponse);

        ResponseEntity<TpePaymentResponseDTO> response = tpeController.initiatePayment(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().transactionId()).isEqualTo("tx-9876");
        assertThat(response.getBody().status()).isEqualTo(TpeTransactionStatus.APPROVED);
        verify(paymentTerminalService).initiatePayment(request);
    }

    @Test
    @DisplayName("cancelPayment cancels transaction and returns 200 OK")
    void cancelPayment_returns200() {
        TpePaymentResponseDTO cancelled = new TpePaymentResponseDTO(
                "tx-9876",
                TpeTransactionStatus.CANCELLED,
                new BigDecimal("23.50"),
                "EUR",
                null,
                "POS01",
                null,
                null,
                null,
                "Cancelled by operator",
                LocalDateTime.now()
        );

        when(paymentTerminalService.cancelPayment("tx-9876")).thenReturn(cancelled);

        ResponseEntity<TpePaymentResponseDTO> response = tpeController.cancelPayment("tx-9876");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(TpeTransactionStatus.CANCELLED);
        verify(paymentTerminalService).cancelPayment("tx-9876");
    }

    @Test
    @DisplayName("getStatus returns current status of transaction")
    void getStatus_returns200() {
        when(paymentTerminalService.getTransactionStatus("tx-9876")).thenReturn(sampleResponse);

        ResponseEntity<TpePaymentResponseDTO> response = tpeController.getStatus("tx-9876");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().transactionId()).isEqualTo("tx-9876");
        verify(paymentTerminalService).getTransactionStatus("tx-9876");
    }

    @Test
    @DisplayName("testConnection tests reachability and returns 200 OK with diagnostics")
    void testConnection_returns200() {
        TpeConnectionTestRequestDTO request = new TpeConnectionTestRequestDTO(
                TpeTerminalRole.BAR,
                "192.168.1.150",
                8888
        );
        TpeConnectionTestResponseDTO diag = new TpeConnectionTestResponseDTO(
                true,
                "Connection successful",
                25L
        );

        when(paymentTerminalService.testConnection(request)).thenReturn(diag);

        ResponseEntity<TpeConnectionTestResponseDTO> response = tpeController.testConnection(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isTrue();
        assertThat(response.getBody().responseTimeMs()).isEqualTo(25L);
        verify(paymentTerminalService).testConnection(request);
    }

    @Test
    @DisplayName("getConfig returns public TPE configuration")
    void getConfig_returns200() {
        TpePublicConfigDTO config = new TpePublicConfigDTO(
                true,
                true,
                true,
                true,
                8888,
                "POS01",
                90
        );

        when(paymentTerminalService.getPublicConfig()).thenReturn(config);

        ResponseEntity<TpePublicConfigDTO> response = tpeController.getConfig();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().enabled()).isTrue();
        assertThat(response.getBody().simulatorEnabled()).isTrue();
        verify(paymentTerminalService).getPublicConfig();
    }
}
