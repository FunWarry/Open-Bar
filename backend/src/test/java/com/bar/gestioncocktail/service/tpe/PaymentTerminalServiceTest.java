package com.bar.gestioncocktail.service.tpe;

import com.bar.gestioncocktail.dto.TpeConnectionTestRequestDTO;
import com.bar.gestioncocktail.dto.TpeConnectionTestResponseDTO;
import com.bar.gestioncocktail.dto.TpePaymentRequestDTO;
import com.bar.gestioncocktail.dto.TpePaymentResponseDTO;
import com.bar.gestioncocktail.dto.TpePublicConfigDTO;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.TpeTerminalRole;
import com.bar.gestioncocktail.model.TpeTransactionStatus;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.time.Duration;

import com.bar.gestioncocktail.exception.BusinessException;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PaymentTerminalService} covering payment orchestration,
 * simulation mode, socket dispatch, STOMP messaging broadcasts, and connection testing.
 */
@ExtendWith(MockitoExtension.class)
class PaymentTerminalServiceTest {

    @Mock
    private AppSettingsService appSettingsService;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private ConcertSocketClient socketClient;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private PaymentTerminalService paymentTerminalService;
    private AppSettings mockSettings;

    @BeforeEach
    void setUp() {
        paymentTerminalService = new PaymentTerminalService(
                appSettingsService,
                establishmentConfigService,
                socketClient,
                messagingTemplate
        );

        mockSettings = new AppSettings();
        mockSettings.setTpeEnabled(true);
        mockSettings.setTpeSimulatorEnabled(true);
        mockSettings.setTpeBarIp("192.168.1.150");
        mockSettings.setTpeFloorIp("192.168.1.151");
        mockSettings.setTpePort(8888);
        mockSettings.setTpeTerminalId("POS01");
        mockSettings.setTpeTimeoutSeconds(90);
    }

    @Test
    @DisplayName("Should return simulated approval when simulator mode is enabled")
    void shouldProcessPaymentInSimulatorMode() {
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        TpePaymentRequestDTO request = new TpePaymentRequestDTO(
                new BigDecimal("28.00"),
                "EUR",
                TpeTerminalRole.BAR,
                null,
                null,
                "Table 5"
        );

        TpePaymentResponseDTO initial = paymentTerminalService.initiatePayment(request);

        assertThat(initial).isNotNull();
        assertThat(initial.status()).isEqualTo(TpeTransactionStatus.INITIATED);
        assertThat(initial.amount()).isEqualByComparingTo(new BigDecimal("28.00"));

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            TpePaymentResponseDTO latest = paymentTerminalService.getTransactionStatus(initial.transactionId());
            assertThat(latest.status()).isEqualTo(TpeTransactionStatus.APPROVED);
            assertThat(latest.authorizationCode()).isNotNull();
            assertThat(latest.maskedPan()).isNotNull();
        });

        verify(messagingTemplate, org.mockito.Mockito.atLeastOnce()).convertAndSend(eq("/topic/payments"), any(TpePaymentResponseDTO.class));
    }

    @Test
    @DisplayName("Should cancel in-flight payment and broadcast CANCELLED state")
    void shouldCancelPayment() {
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        TpePaymentRequestDTO request = new TpePaymentRequestDTO(
                new BigDecimal("45.00"),
                "EUR",
                TpeTerminalRole.FLOOR,
                null,
                null,
                "Table 2"
        );

        TpePaymentResponseDTO initial = paymentTerminalService.initiatePayment(request);
        TpePaymentResponseDTO cancelled = paymentTerminalService.cancelPayment(initial.transactionId());

        assertThat(cancelled.status()).isEqualTo(TpeTransactionStatus.CANCELLED);
        verify(socketClient).abortTransaction(initial.transactionId());
    }

    @Test
    @DisplayName("Should test TPE socket connection successfully when socket test succeeds")
    void shouldTestTpeConnectionSuccessfully() throws Exception {
        mockSettings.setTpeSimulatorEnabled(false);
        when(appSettingsService.getSettings()).thenReturn(mockSettings);
        when(socketClient.testConnection("192.168.1.150", 8888, 4000)).thenReturn(42L);

        TpeConnectionTestRequestDTO request = new TpeConnectionTestRequestDTO(
                TpeTerminalRole.BAR,
                null,
                null
        );

        TpeConnectionTestResponseDTO response = paymentTerminalService.testConnection(request);

        assertThat(response.success()).isTrue();
        assertThat(response.responseTimeMs()).isEqualTo(42L);
    }

    @Test
    @DisplayName("Should return public TPE configuration reflecting establishment settings")
    void shouldReturnPublicConfig() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.PAYMENT_TERMINAL)).thenReturn(true);
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        TpePublicConfigDTO config = paymentTerminalService.getPublicConfig();

        assertThat(config.enabled()).isTrue();
        assertThat(config.simulatorEnabled()).isTrue();
        assertThat(config.barIpConfigured()).isTrue();
        assertThat(config.floorIpConfigured()).isTrue();
        assertThat(config.port()).isEqualTo(8888);
        assertThat(config.terminalId()).isEqualTo("POS01");
    }

    @Test
    @DisplayName("Should process hardware payment and transition to APPROVED")
    void shouldProcessHardwarePaymentApproved() {
        mockSettings.setTpeSimulatorEnabled(false);
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        ConcertFrameBuilder.ConcertResponse mockResponse = new ConcertFrameBuilder.ConcertResponse(
                "01",
                TpeTransactionStatus.APPROVED,
                new BigDecimal("50.00"),
                "AUTH777",
                "VISA",
                "4970********1234",
                "001",
                "Payment accepted"
        );
        when(socketClient.sendDebitTransaction(any(), eq("192.168.1.150"), eq(8888), eq(90), any()))
                .thenReturn(mockResponse);

        TpePaymentRequestDTO request = new TpePaymentRequestDTO(
                new BigDecimal("50.00"),
                "EUR",
                TpeTerminalRole.BAR,
                null,
                null,
                "Table 1"
        );

        TpePaymentResponseDTO initial = paymentTerminalService.initiatePayment(request);

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            TpePaymentResponseDTO latest = paymentTerminalService.getTransactionStatus(initial.transactionId());
            assertThat(latest.status()).isEqualTo(TpeTransactionStatus.APPROVED);
            assertThat(latest.authorizationCode()).isEqualTo("AUTH777");
            assertThat(latest.cardBrand()).isEqualTo("VISA");
        });
    }

    @Test
    @DisplayName("Should process hardware payment and record DECLINED status")
    void shouldProcessHardwarePaymentDeclined() {
        mockSettings.setTpeSimulatorEnabled(false);
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        ConcertFrameBuilder.ConcertResponse mockResponse = new ConcertFrameBuilder.ConcertResponse(
                "01",
                TpeTransactionStatus.DECLINED,
                new BigDecimal("30.00"),
                null,
                "CB",
                "4970********0000",
                "002",
                "Transaction declined"
        );
        when(socketClient.sendDebitTransaction(any(), eq("192.168.1.150"), eq(8888), eq(90), any()))
                .thenReturn(mockResponse);

        TpePaymentRequestDTO request = new TpePaymentRequestDTO(
                new BigDecimal("30.00"),
                "EUR",
                TpeTerminalRole.BAR,
                null,
                null,
                "Table 3"
        );

        TpePaymentResponseDTO initial = paymentTerminalService.initiatePayment(request);

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            TpePaymentResponseDTO latest = paymentTerminalService.getTransactionStatus(initial.transactionId());
            assertThat(latest.status()).isEqualTo(TpeTransactionStatus.DECLINED);
        });
    }

    @Test
    @DisplayName("Should handle hardware execution socket exception gracefully")
    void shouldHandleHardwareSocketException() {
        mockSettings.setTpeSimulatorEnabled(false);
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        when(socketClient.sendDebitTransaction(any(), eq("192.168.1.150"), eq(8888), eq(90), any()))
                .thenThrow(new RuntimeException("Connection timed out"));

        TpePaymentRequestDTO request = new TpePaymentRequestDTO(
                new BigDecimal("15.00"),
                "EUR",
                TpeTerminalRole.BAR,
                null,
                null,
                "Table 4"
        );

        TpePaymentResponseDTO initial = paymentTerminalService.initiatePayment(request);

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            TpePaymentResponseDTO latest = paymentTerminalService.getTransactionStatus(initial.transactionId());
            assertThat(latest.status()).isEqualTo(TpeTransactionStatus.ERROR);
            assertThat(latest.message()).contains("Connection timed out");
        });
    }

    @Test
    @DisplayName("Should handle missing terminal IP in hardware payment")
    void shouldHandleMissingTerminalIp() {
        mockSettings.setTpeSimulatorEnabled(false);
        mockSettings.setTpeBarIp(null);
        mockSettings.setTpeFloorIp(null);
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        TpePaymentRequestDTO request = new TpePaymentRequestDTO(
                new BigDecimal("20.00"),
                "EUR",
                TpeTerminalRole.BAR,
                null,
                null,
                "Table 2"
        );

        TpePaymentResponseDTO initial = paymentTerminalService.initiatePayment(request);

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            TpePaymentResponseDTO latest = paymentTerminalService.getTransactionStatus(initial.transactionId());
            assertThat(latest.status()).isEqualTo(TpeTransactionStatus.ERROR);
        });
    }

    @Test
    @DisplayName("Should test connection in simulator mode directly with simulated latency")
    void shouldTestConnectionInSimulatorMode() {
        mockSettings.setTpeSimulatorEnabled(true);
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        TpeConnectionTestRequestDTO request = new TpeConnectionTestRequestDTO(
                TpeTerminalRole.BAR,
                null,
                null
        );

        TpeConnectionTestResponseDTO response = paymentTerminalService.testConnection(request);

        assertThat(response.success()).isTrue();
        assertThat(response.message()).contains("Simulated TPE terminal reachable");
        assertThat(response.responseTimeMs()).isPositive();
    }

    @Test
    @DisplayName("Should handle socket error during connection test")
    void shouldHandleConnectionTestSocketError() throws Exception {
        mockSettings.setTpeSimulatorEnabled(false);
        when(appSettingsService.getSettings()).thenReturn(mockSettings);
        when(socketClient.testConnection("192.168.1.150", 8888, 4000))
                .thenThrow(new java.io.IOException("Host unreachable"));

        TpeConnectionTestRequestDTO request = new TpeConnectionTestRequestDTO(
                TpeTerminalRole.BAR,
                null,
                null
        );

        TpeConnectionTestResponseDTO response = paymentTerminalService.testConnection(request);

        assertThat(response.success()).isFalse();
        assertThat(response.message()).contains("Host unreachable");
    }

    @Test
    @DisplayName("Should throw BusinessException when querying status for unknown transaction")
    void shouldThrowWhenTransactionNotFound() {
        assertThatThrownBy(() -> paymentTerminalService.getTransactionStatus("non-existent-tx"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Transaction not found");
    }

    @Test
    @DisplayName("Should cancel active transaction and mark status as CANCELLED")
    void shouldCancelActiveTransaction() {
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        TpePaymentRequestDTO request = new TpePaymentRequestDTO(
                new BigDecimal("10.00"),
                "EUR",
                TpeTerminalRole.BAR,
                null,
                null,
                "Table 1"
        );

        TpePaymentResponseDTO initial = paymentTerminalService.initiatePayment(request);
        TpePaymentResponseDTO cancelled = paymentTerminalService.cancelPayment(initial.transactionId());

        assertThat(cancelled.status()).isEqualTo(TpeTransactionStatus.CANCELLED);
        verify(socketClient).abortTransaction(initial.transactionId());
    }

    @Test
    @DisplayName("Should return failure when no IP address configured for role")
    void shouldReturnFailureWhenNoIpConfigured() {
        mockSettings.setTpeSimulatorEnabled(false);
        mockSettings.setTpeBarIp(null);
        mockSettings.setTpeFloorIp(null);
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        TpeConnectionTestRequestDTO request = new TpeConnectionTestRequestDTO(
                TpeTerminalRole.BAR,
                null,
                null
        );

        TpeConnectionTestResponseDTO response = paymentTerminalService.testConnection(request);

        assertThat(response.success()).isFalse();
        assertThat(response.message()).contains("No terminal IP configured");
    }

    @Test
    @DisplayName("Should return public config indicating disabled when module is off")
    void shouldReturnDisabledPublicConfigWhenModuleDisabled() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.PAYMENT_TERMINAL)).thenReturn(false);
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        TpePublicConfigDTO config = paymentTerminalService.getPublicConfig();

        assertThat(config.enabled()).isFalse();
        assertThat(config.simulatorEnabled()).isTrue();
    }

    @Test
    @DisplayName("Should resolve floor IP when configured and fallback to bar IP when floor IP is blank")
    void shouldResolveFloorIpAndFallbackToBarIp() throws Exception {
        mockSettings.setTpeSimulatorEnabled(false);
        mockSettings.setTpeFloorIp("192.168.1.180");
        mockSettings.setTpeBarIp("192.168.1.150");
        when(appSettingsService.getSettings()).thenReturn(mockSettings);

        when(socketClient.testConnection("192.168.1.180", 8888, 4000)).thenReturn(42L);

        TpeConnectionTestResponseDTO resFloor = paymentTerminalService.testConnection(
                new TpeConnectionTestRequestDTO(TpeTerminalRole.FLOOR, null, null)
        );
        assertThat(resFloor.success()).isTrue();
        assertThat(resFloor.responseTimeMs()).isEqualTo(42L);
        verify(socketClient).testConnection("192.168.1.180", 8888, 4000);

        // Now blank floor IP -> should fallback to Bar IP
        mockSettings.setTpeFloorIp("   ");
        when(socketClient.testConnection("192.168.1.150", 8888, 4000)).thenReturn(42L);

        TpeConnectionTestResponseDTO resFallback = paymentTerminalService.testConnection(
                new TpeConnectionTestRequestDTO(TpeTerminalRole.FLOOR, null, null)
        );
        assertThat(resFallback.success()).isTrue();
        assertThat(resFallback.responseTimeMs()).isEqualTo(42L);
        verify(socketClient).testConnection("192.168.1.150", 8888, 4000);
    }

    @Test
    @DisplayName("Should test connection using manual IP and custom request port")
    void shouldTestConnectionWithManualIpAndCustomPort() throws Exception {
        mockSettings.setTpeSimulatorEnabled(false);
        when(appSettingsService.getSettings()).thenReturn(mockSettings);
        when(socketClient.testConnection("10.0.0.50", 9999, 4000)).thenReturn(55L);

        TpeConnectionTestResponseDTO res = paymentTerminalService.testConnection(
                new TpeConnectionTestRequestDTO(TpeTerminalRole.BAR, " 10.0.0.50 ", 9999)
        );

        assertThat(res.success()).isTrue();
        assertThat(res.responseTimeMs()).isEqualTo(55L);
        verify(socketClient).testConnection("10.0.0.50", 9999, 4000);
    }
}
