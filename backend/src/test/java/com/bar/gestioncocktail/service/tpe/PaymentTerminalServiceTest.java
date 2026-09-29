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

import static org.assertj.core.api.Assertions.assertThat;
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
}
