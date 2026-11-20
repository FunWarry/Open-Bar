package com.bar.gestioncocktail.service.monetization;

import com.bar.gestioncocktail.config.MonetizationProperties;
import com.bar.gestioncocktail.dto.StripeTerminalConnectionTokenDTO;
import com.bar.gestioncocktail.dto.TpePaymentRequestDTO;
import com.bar.gestioncocktail.dto.TpePaymentResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.CardCommissionSource;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.TpeMonetizationTier;
import com.bar.gestioncocktail.model.TpeTerminalRole;
import com.bar.gestioncocktail.model.TpeTransactionStatus;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import com.bar.gestioncocktail.service.payment.PaymentWebhookResult;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import com.stripe.model.PaymentIntent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link StripeTerminalConnectService}.
 */
@ExtendWith(MockitoExtension.class)
class StripeTerminalConnectServiceTest {

    @Mock
    private CommissionCalculator commissionCalculator;
    @Mock
    private CommissionLedgerService commissionLedgerService;
    @Mock
    private EstablishmentConfigService establishmentConfigService;
    @Mock
    private AppSettingsService appSettingsService;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private MonetizationProperties properties;
    private StripeTerminalConnectService service;
    private AppSettings settings;

    @BeforeEach
    void setUp() {
        properties = new MonetizationProperties();
        properties.setStripeTerminalSimulatorFallback(true);
        settings = new AppSettings();
        settings.setTpeSimulatorEnabled(true);
        settings.setStripeTerminalReaderId("tmr_wisepos_01");
        settings.setStripeTerminalLocationId("tml_bar_01");

        lenient().when(appSettingsService.getSettings()).thenReturn(settings);
        service = new StripeTerminalConnectService(
                properties, commissionCalculator, commissionLedgerService,
                establishmentConfigService, appSettingsService, messagingTemplate);
    }

    @Test
    @DisplayName("createConnectionToken - returns simulated connection token when Stripe secret key is absent")
    void createConnectionToken_simulatorFallback_returnsSimSecret() {
        StripeTerminalConnectionTokenDTO token = service.createConnectionToken();

        assertTrue(token.simulator());
        assertTrue(token.secret().startsWith("pst_test_sim_"));
        assertEquals("tmr_wisepos_01", token.readerId());
        verify(establishmentConfigService).checkModuleEnabled(EstablishmentModule.STRIPE_TERMINAL_CONNECT);
    }

    @Test
    @DisplayName("createConnectionToken - throws BusinessException when key missing and simulator disabled")
    void createConnectionToken_noKeyNoSimulator_throwsException() {
        properties.setStripeTerminalSimulatorFallback(false);
        settings.setTpeSimulatorEnabled(false);

        assertThrows(BusinessException.class, () -> service.createConnectionToken());
    }

    @Test
    @DisplayName("executeTerminalPayment - approves simulated WisePOS E payment and broadcasts STOMP status")
    void executeTerminalPayment_simulator_approvesAndBroadcasts() {
        when(commissionCalculator.calculateForTier(new BigDecimal("40.00"), TpeMonetizationTier.STRIPE_TERMINAL_CONNECT))
                .thenReturn(new CommissionCalculator.CommissionCalculation(45, 5, new BigDecimal("0.23"), 23L));

        Map<String, TpePaymentResponseDTO> active = new ConcurrentHashMap<>();
        Map<String, Boolean> cancelled = new ConcurrentHashMap<>();
        TpePaymentRequestDTO req = new TpePaymentRequestDTO(
                new BigDecimal("40.00"), "EUR", TpeTerminalRole.BAR, null, null, "Table 4");

        TpePaymentResponseDTO res = service.executeTerminalPayment("tx-st-1", req, active, cancelled, "EUR");

        assertEquals(TpeTransactionStatus.APPROVED, res.status());
        assertTrue(res.authorizationCode().startsWith("pi_sim_"));
        assertEquals("tmr_wisepos_01", res.terminalId());
        verify(messagingTemplate, atLeast(3)).convertAndSend(eq("/topic/payments"), any(TpePaymentResponseDTO.class));
    }

    @Test
    @DisplayName("processVerifiedEvent - records Option 3 ledger entry on payment_intent.succeeded")
    void processVerifiedEvent_paymentIntentSucceeded_recordsLedger() {
        PaymentIntent pi = new PaymentIntent();
        pi.setId("pi_live_999");
        pi.setAmount(2500L);
        pi.setAmountReceived(2500L);
        pi.setCurrency("eur");
        pi.setMetadata(Map.of("openbarTransactionId", "tx-local-99", "readerId", "tmr_wisepos_01", "reference", "Table 7"));

        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.of(pi));

        Event event = mock(Event.class);
        when(event.getType()).thenReturn("payment_intent.succeeded");
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);

        PaymentWebhookResult result = service.processVerifiedEvent(event);

        assertEquals("SUCCEEDED", result.status());
        assertEquals(new BigDecimal("25.00"), result.amount());
        verify(commissionLedgerService).recordCardSettlement(argThat(cmd ->
                cmd.source() == CardCommissionSource.STRIPE_TERMINAL_CONNECT
                        && cmd.externalTransactionId().equals("tx-local-99")
                        && cmd.grossAmount().equals(new BigDecimal("25.00"))));
    }

    @Test
    @DisplayName("processVerifiedEvent - settles or flags commission invoice on Stripe Billing invoice webhooks")
    void processVerifiedEvent_invoiceWebhooks_updatesBillingStatus() {
        Invoice paidInv = new Invoice();
        paidInv.setId("in_paid_1");
        paidInv.setAmountPaid(1250L);
        paidInv.setCurrency("eur");

        EventDataObjectDeserializer d1 = mock(EventDataObjectDeserializer.class);
        when(d1.getObject()).thenReturn(Optional.of(paidInv));
        Event e1 = mock(Event.class);
        when(e1.getType()).thenReturn("invoice.payment_succeeded");
        when(e1.getDataObjectDeserializer()).thenReturn(d1);

        PaymentWebhookResult r1 = service.processVerifiedEvent(e1);
        assertEquals("SUCCEEDED", r1.status());
        verify(commissionLedgerService).markRemoteInvoiceSettled("in_paid_1");

        Invoice failedInv = new Invoice();
        failedInv.setId("in_fail_2");
        failedInv.setAmountRemaining(1800L);
        failedInv.setCurrency("eur");

        EventDataObjectDeserializer d2 = mock(EventDataObjectDeserializer.class);
        when(d2.getObject()).thenReturn(Optional.of(failedInv));
        Event e2 = mock(Event.class);
        when(e2.getType()).thenReturn("invoice.payment_failed");
        when(e2.getDataObjectDeserializer()).thenReturn(d2);

        PaymentWebhookResult r2 = service.processVerifiedEvent(e2);
        assertEquals("FAILED", r2.status());
        verify(commissionLedgerService).markRemoteInvoicePaymentFailed("in_fail_2", new BigDecimal("18.00"));
    }

    @Test
    @DisplayName("handleStripeConnectWebhook and processVerifiedEvent - covers null, ignored, failed intent, and signature errors")
    void webhookEdgeCases_covered() {
        assertThrows(BusinessException.class, () -> service.handleStripeConnectWebhook("{}", "sig"));

        properties.setStripeConnectWebhookSecret("whsec_test_secret");
        assertThrows(BusinessException.class, () -> service.handleStripeConnectWebhook("{}", "bad_sig"));

        assertEquals("IGNORED", service.processVerifiedEvent(null).status());

        Event unknownEvt = mock(Event.class);
        when(unknownEvt.getType()).thenReturn("customer.updated");
        when(unknownEvt.getDataObjectDeserializer()).thenReturn(mock(EventDataObjectDeserializer.class));
        assertEquals("IGNORED", service.processVerifiedEvent(unknownEvt).status());

        PaymentIntent failedPi = new PaymentIntent();
        failedPi.setId("pi_fail_1");
        failedPi.setAmount(1950L);
        failedPi.setCurrency("eur");
        failedPi.setMetadata(Map.of("openbarTransactionId", "tx-fail-1"));
        EventDataObjectDeserializer failDeser = mock(EventDataObjectDeserializer.class);
        when(failDeser.getObject()).thenReturn(Optional.of(failedPi));
        Event failEvt = mock(Event.class);
        when(failEvt.getType()).thenReturn("payment_intent.payment_failed");
        when(failEvt.getDataObjectDeserializer()).thenReturn(failDeser);

        PaymentWebhookResult failRes = service.processVerifiedEvent(failEvt);
        assertEquals("FAILED", failRes.status());
        verify(messagingTemplate).convertAndSend(eq("/topic/payments"), any(TpePaymentResponseDTO.class));
    }
}
