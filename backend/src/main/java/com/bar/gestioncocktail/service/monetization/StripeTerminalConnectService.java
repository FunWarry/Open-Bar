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
import com.bar.gestioncocktail.model.TpeTransactionStatus;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import com.bar.gestioncocktail.service.payment.PaymentWebhookResult;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.model.terminal.ConnectionToken;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.terminal.ConnectionTokenCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;

/**
 * Option 3 Turnkey Smart TPE service integrating Stripe Terminal Connect (WisePOS E / PayFac).
 * <p>
 * Creates Stripe Terminal {@code ConnectionToken}s and {@code card_present} {@code PaymentIntent}s
 * with automatic {@code application_fee_amount} deduction at the lower Option 3 platform margin,
 * handles Stripe Connect webhooks, and provides an automatic dev/demo simulator fallback.
 */
@Service
public class StripeTerminalConnectService {

    private static final Logger log = LoggerFactory.getLogger(StripeTerminalConnectService.class);
    private static final String PAYMENTS_TOPIC = "/topic/payments";
    private static final ZoneId SYSTEM_ZONE = ZoneId.systemDefault();

    private final MonetizationProperties monetizationProperties;
    private final CommissionCalculator commissionCalculator;
    private final CommissionLedgerService commissionLedgerService;
    private final EstablishmentConfigService establishmentConfigService;
    private final AppSettingsService appSettingsService;
    private final SimpMessagingTemplate messagingTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Constructs StripeTerminalConnectService with required payment, commission, and STOMP dependencies.
     */
    public StripeTerminalConnectService(
            MonetizationProperties monetizationProperties,
            CommissionCalculator commissionCalculator,
            CommissionLedgerService commissionLedgerService,
            EstablishmentConfigService establishmentConfigService,
            AppSettingsService appSettingsService,
            SimpMessagingTemplate messagingTemplate) {
        this.monetizationProperties = monetizationProperties;
        this.commissionCalculator = commissionCalculator;
        this.commissionLedgerService = commissionLedgerService;
        this.establishmentConfigService = establishmentConfigService;
        this.appSettingsService = appSettingsService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Generates a short-lived Stripe Terminal ConnectionToken for smart Android readers (e.g. WisePOS E),
     * falling back to a simulated connection token in dev/demo mode when keys are absent.
     *
     * @return {@link StripeTerminalConnectionTokenDTO}
     */
    public StripeTerminalConnectionTokenDTO createConnectionToken() {
        establishmentConfigService.checkModuleEnabled(EstablishmentModule.STRIPE_TERMINAL_CONNECT);
        AppSettings settings = appSettingsService.getSettings();
        String secretKey = resolveStripeSecretKey(settings);

        if (secretKey == null) {
            if (isSimulatorAllowed(settings)) {
                return new StripeTerminalConnectionTokenDTO(
                        "pst_test_sim_" + UUID.randomUUID().toString().replace("-", ""),
                        true,
                        settings != null ? settings.getStripeTerminalReaderId() : "tmr_sim_wisepos",
                        settings != null ? settings.getStripeTerminalLocationId() : "tml_sim_bar"
                );
            }
            throw new BusinessException("Stripe Connect secret key is not configured for Stripe Terminal.");
        }

        try {
            ConnectionTokenCreateParams.Builder builder = ConnectionTokenCreateParams.builder();
            if (settings != null && settings.getStripeTerminalLocationId() != null
                    && !settings.getStripeTerminalLocationId().isBlank()) {
                builder.setLocation(settings.getStripeTerminalLocationId().trim());
            }
            RequestOptions.RequestOptionsBuilder opts = RequestOptions.builder().setApiKey(secretKey);
            if (settings != null && settings.getStripeConnectedAccountId() != null
                    && !settings.getStripeConnectedAccountId().isBlank()) {
                opts.setStripeAccount(settings.getStripeConnectedAccountId().trim());
            }
            ConnectionToken token = ConnectionToken.create(builder.build(), opts.build());
            return new StripeTerminalConnectionTokenDTO(
                    token.getSecret(),
                    false,
                    settings != null ? settings.getStripeTerminalReaderId() : null,
                    settings != null ? settings.getStripeTerminalLocationId() : null
            );
        } catch (StripeException ex) {
            log.error("Failed to create Stripe Terminal ConnectionToken: {}", ex.getMessage(), ex);
            throw new BusinessException("Stripe Terminal connection token error: " + ex.getMessage());
        }
    }

    /**
     * Executes an Option 3 Stripe Terminal Connect {@code card_present} payment with automatic
     * {@code application_fee_amount} deduction, or runs the realistic simulator in dev/demo mode.
     *
     * @param transactionId     Local tracking UUID
     * @param request           TPE payment request
     * @param activeMap         Active transactions registry shared with {@code PaymentTerminalService}
     * @param cancelledMap      Cancelled flags registry
     * @param currencyCode      3-letter currency code
     * @return Terminal payment status response
     */
    public TpePaymentResponseDTO executeTerminalPayment(
            String transactionId,
            TpePaymentRequestDTO request,
            Map<String, TpePaymentResponseDTO> activeMap,
            Map<String, Boolean> cancelledMap,
            String currencyCode) {

        establishmentConfigService.checkModuleEnabled(EstablishmentModule.STRIPE_TERMINAL_CONNECT);
        AppSettings settings = appSettingsService.getSettings();
        String secretKey = resolveStripeSecretKey(settings);

        CommissionCalculator.CommissionCalculation calc = commissionCalculator.calculateForTier(
                request.montant(), TpeMonetizationTier.STRIPE_TERMINAL_CONNECT);

        if (secretKey == null || isSimulatorAllowed(settings) && Boolean.TRUE.equals(settings != null ? settings.getTpeSimulatorEnabled() : Boolean.TRUE)) {
            if (secretKey == null && !isSimulatorAllowed(settings)) {
                throw new BusinessException("Stripe Connect secret key is required when simulator fallback is disabled.");
            }
            return runSimulatedTerminalPayment(transactionId, request, activeMap, cancelledMap, currencyCode, calc, settings);
        }

        return runLiveStripeTerminalPayment(transactionId, request, activeMap, currencyCode, calc, settings, secretKey);
    }

    /**
     * Verifies and processes incoming Stripe Connect webhooks for both Option 3 Terminal payments
     * ({@code payment_intent.succeeded}, {@code payment_intent.payment_failed}) and Option 1 Stripe
     * commission billing invoices ({@code invoice.payment_succeeded}, {@code invoice.payment_failed}).
     *
     * @param payload         Raw JSON event payload
     * @param signatureHeader Stripe-Signature HTTP header
     * @return {@link PaymentWebhookResult}
     */
    public PaymentWebhookResult handleStripeConnectWebhook(String payload, String signatureHeader) {
        String webhookSecret = resolveWebhookSecret();
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new BusinessException("Stripe Connect webhook signing secret is not configured.");
        }
        Event event;
        try {
            event = Webhook.constructEvent(payload, signatureHeader, webhookSecret);
        } catch (SignatureVerificationException ex) {
            log.warn("Stripe Connect webhook signature verification failed: {}", ex.getMessage());
            throw new BusinessException("Invalid Stripe Connect webhook signature.");
        }

        return processVerifiedEvent(event);
    }

    /**
     * Processes a pre-verified Stripe {@link Event} for Connect terminal intents or commission billing invoices.
     *
     * @param event Verified Stripe event
     * @return {@link PaymentWebhookResult}
     */
    public PaymentWebhookResult processVerifiedEvent(Event event) {
        if (event == null) {
            return new PaymentWebhookResult(null, "IGNORED", null, BigDecimal.ZERO, "EUR", null);
        }

        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        StripeObject stripeObject = deserializer.getObject().orElse(null);

        return switch (event.getType()) {
            case "payment_intent.succeeded" -> handlePaymentIntentSucceeded(stripeObject);
            case "payment_intent.payment_failed" -> handlePaymentIntentFailed(stripeObject);
            case "invoice.payment_succeeded" -> handleInvoicePaymentSucceeded(stripeObject);
            case "invoice.payment_failed" -> handleInvoicePaymentFailed(stripeObject);
            default -> new PaymentWebhookResult(null, "IGNORED", null, BigDecimal.ZERO, "EUR", null);
        };
    }

    private PaymentWebhookResult handlePaymentIntentSucceeded(StripeObject stripeObject) {
        if (!(stripeObject instanceof PaymentIntent pi)) {
            return new PaymentWebhookResult(null, "IGNORED", null, BigDecimal.ZERO, "EUR", null);
        }
        BigDecimal settledAmount = BigDecimal.valueOf(
                        pi.getAmountReceived() != null && pi.getAmountReceived() > 0 ? pi.getAmountReceived() : pi.getAmount())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        String currency = pi.getCurrency() != null ? pi.getCurrency().toUpperCase() : "EUR";
        String openbarTxId = pi.getMetadata() != null ? pi.getMetadata().get("openbarTransactionId") : null;
        String terminalId = pi.getMetadata() != null && pi.getMetadata().get("readerId") != null
                ? pi.getMetadata().get("readerId")
                : "ST-WISEPOS";

        commissionLedgerService.recordCardSettlement(new CommissionLedgerService.CardSettlementRecordCommand(
                null,
                null,
                pi.getMetadata() != null ? pi.getMetadata().get("reference") : null,
                openbarTxId != null ? openbarTxId : pi.getId(),
                pi.getId(),
                terminalId,
                "STRIPE_TERMINAL",
                "****",
                CardCommissionSource.STRIPE_TERMINAL_CONNECT,
                settledAmount,
                currency
        ));

        if (openbarTxId != null && !openbarTxId.isBlank()) {
            broadcastStatus(new TpePaymentResponseDTO(
                    openbarTxId,
                    TpeTransactionStatus.APPROVED,
                    settledAmount,
                    currency,
                    pi.getId(),
                    terminalId,
                    "CB",
                    "************4242",
                    pi.getId(),
                    "Stripe Terminal payment accepted",
                    LocalDateTime.now(SYSTEM_ZONE)
            ));
        }

        return new PaymentWebhookResult(pi.getId(), "SUCCEEDED", "card_present", settledAmount, currency, pi.getReceiptEmail());
    }

    private PaymentWebhookResult handlePaymentIntentFailed(StripeObject stripeObject) {
        if (!(stripeObject instanceof PaymentIntent pi)) {
            return new PaymentWebhookResult(null, "IGNORED", null, BigDecimal.ZERO, "EUR", null);
        }
        BigDecimal amount = BigDecimal.valueOf(pi.getAmount() != null ? pi.getAmount() : 0L)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        String currency = pi.getCurrency() != null ? pi.getCurrency().toUpperCase() : "EUR";
        String openbarTxId = pi.getMetadata() != null ? pi.getMetadata().get("openbarTransactionId") : null;
        if (openbarTxId != null && !openbarTxId.isBlank()) {
            broadcastStatus(new TpePaymentResponseDTO(
                    openbarTxId,
                    TpeTransactionStatus.DECLINED,
                    amount,
                    currency,
                    null,
                    "ST-WISEPOS",
                    null,
                    null,
                    null,
                    "Stripe Terminal payment declined",
                    LocalDateTime.now(SYSTEM_ZONE)
            ));
        }
        return new PaymentWebhookResult(pi.getId(), "FAILED", "card_present", amount, currency, null);
    }

    private PaymentWebhookResult handleInvoicePaymentSucceeded(StripeObject stripeObject) {
        if (!(stripeObject instanceof Invoice invoice)) {
            return new PaymentWebhookResult(null, "IGNORED", null, BigDecimal.ZERO, "EUR", null);
        }
        commissionLedgerService.markRemoteInvoiceSettled(invoice.getId());
        BigDecimal paid = BigDecimal.valueOf(invoice.getAmountPaid() != null ? invoice.getAmountPaid() : 0L)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return new PaymentWebhookResult(invoice.getId(), "SUCCEEDED", "invoice", paid,
                invoice.getCurrency() != null ? invoice.getCurrency().toUpperCase() : "EUR", null);
    }

    private PaymentWebhookResult handleInvoicePaymentFailed(StripeObject stripeObject) {
        if (!(stripeObject instanceof Invoice invoice)) {
            return new PaymentWebhookResult(null, "IGNORED", null, BigDecimal.ZERO, "EUR", null);
        }
        BigDecimal due = BigDecimal.valueOf(invoice.getAmountRemaining() != null ? invoice.getAmountRemaining() : 0L)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        commissionLedgerService.markRemoteInvoicePaymentFailed(invoice.getId(), due);
        return new PaymentWebhookResult(invoice.getId(), "FAILED", "invoice", due,
                invoice.getCurrency() != null ? invoice.getCurrency().toUpperCase() : "EUR", null);
    }

    private TpePaymentResponseDTO runLiveStripeTerminalPayment(
            String transactionId,
            TpePaymentRequestDTO request,
            Map<String, TpePaymentResponseDTO> activeMap,
            String currencyCode,
            CommissionCalculator.CommissionCalculation calc,
            AppSettings settings,
            String secretKey) {
        try {
            long amountCents = request.montant().multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP).longValueExact();
            String readerId = (settings != null && settings.getStripeTerminalReaderId() != null
                    && !settings.getStripeTerminalReaderId().isBlank())
                    ? settings.getStripeTerminalReaderId().trim()
                    : "ST-WISEPOS";

            PaymentIntentCreateParams.Builder params = PaymentIntentCreateParams.builder()
                    .setAmount(amountCents)
                    .setCurrency(currencyCode.toLowerCase())
                    .addPaymentMethodType("card_present")
                    .setCaptureMethod(PaymentIntentCreateParams.CaptureMethod.AUTOMATIC)
                    .putMetadata("openbarTransactionId", transactionId)
                    .putMetadata("openbarTier", TpeMonetizationTier.STRIPE_TERMINAL_CONNECT.name())
                    .putMetadata("readerId", readerId)
                    .putMetadata("reference", request.reference() != null ? request.reference() : "");

            if (settings != null && settings.getStripeConnectedAccountId() != null
                    && !settings.getStripeConnectedAccountId().isBlank()) {
                String connectedAccount = settings.getStripeConnectedAccountId().trim();
                params.setApplicationFeeAmount(calc.commissionCents());
                params.setTransferData(PaymentIntentCreateParams.TransferData.builder()
                        .setDestination(connectedAccount)
                        .build());
            }

            RequestOptions opts = RequestOptions.builder()
                    .setApiKey(secretKey)
                    .setIdempotencyKey("tpe_" + transactionId)
                    .build();

            PaymentIntent intent = PaymentIntent.create(params.build(), opts);
            TpePaymentResponseDTO waiting = new TpePaymentResponseDTO(
                    transactionId,
                    TpeTransactionStatus.WAITING_CARD,
                    request.montant(),
                    currencyCode,
                    intent.getId(),
                    readerId,
                    null,
                    null,
                    intent.getId(),
                    "Present card on Stripe Terminal (" + readerId + ")",
                    LocalDateTime.now(SYSTEM_ZONE)
            );
            activeMap.put(transactionId, waiting);
            broadcastStatus(waiting);
            return waiting;
        } catch (StripeException ex) {
            log.error("Stripe Terminal PaymentIntent creation failed: {}", ex.getMessage(), ex);
            TpePaymentResponseDTO error = new TpePaymentResponseDTO(
                    transactionId,
                    TpeTransactionStatus.ERROR,
                    request.montant(),
                    currencyCode,
                    null,
                    "ST-WISEPOS",
                    null,
                    null,
                    null,
                    "Stripe Terminal error: " + ex.getMessage(),
                    LocalDateTime.now(SYSTEM_ZONE)
            );
            activeMap.put(transactionId, error);
            broadcastStatus(error);
            return error;
        }
    }

    private TpePaymentResponseDTO runSimulatedTerminalPayment(
            String transactionId,
            TpePaymentRequestDTO request,
            Map<String, TpePaymentResponseDTO> activeMap,
            Map<String, Boolean> cancelledMap,
            String currencyCode,
            CommissionCalculator.CommissionCalculation calc,
            AppSettings settings) {
        String readerId = (settings != null && settings.getStripeTerminalReaderId() != null
                && !settings.getStripeTerminalReaderId().isBlank())
                ? settings.getStripeTerminalReaderId().trim()
                : "ST-WISEPOS-SIM";
        try {
            sleep(350);
            if (Boolean.TRUE.equals(cancelledMap.get(transactionId))) {
                return activeMap.get(transactionId);
            }
            TpePaymentResponseDTO waiting = new TpePaymentResponseDTO(
                    transactionId, TpeTransactionStatus.WAITING_CARD, request.montant(), currencyCode,
                    null, readerId, null, null, null,
                    "Tap or insert card on WisePOS E (Stripe Terminal Simulator)...",
                    LocalDateTime.now(SYSTEM_ZONE));
            activeMap.put(transactionId, waiting);
            broadcastStatus(waiting);

            sleep(500);
            if (Boolean.TRUE.equals(cancelledMap.get(transactionId))) {
                return activeMap.get(transactionId);
            }
            TpePaymentResponseDTO processing = new TpePaymentResponseDTO(
                    transactionId, TpeTransactionStatus.PROCESSING, request.montant(), currencyCode,
                    null, readerId, null, null, null,
                    "Processing Stripe Connect split (fee: " + calc.commission() + " " + currencyCode + ")...",
                    LocalDateTime.now(SYSTEM_ZONE));
            activeMap.put(transactionId, processing);
            broadcastStatus(processing);

            sleep(450);
            if (Boolean.TRUE.equals(cancelledMap.get(transactionId))) {
                return activeMap.get(transactionId);
            }
            String piId = "pi_sim_" + (100000 + secureRandom.nextInt(900000));
            String panLast4 = String.valueOf(1000 + secureRandom.nextInt(9000));
            TpePaymentResponseDTO approved = new TpePaymentResponseDTO(
                    transactionId,
                    TpeTransactionStatus.APPROVED,
                    request.montant(),
                    currencyCode,
                    piId,
                    readerId,
                    "VISA",
                    "************" + panLast4,
                    piId,
                    "Stripe Terminal payment accepted (Connect fee split applied)",
                    LocalDateTime.now(SYSTEM_ZONE)
            );
            activeMap.put(transactionId, approved);
            broadcastStatus(approved);
            return approved;
        } catch (Exception ex) {
            TpePaymentResponseDTO err = new TpePaymentResponseDTO(
                    transactionId, TpeTransactionStatus.ERROR, request.montant(), currencyCode,
                    null, readerId, null, null, null, ex.getMessage(), LocalDateTime.now(SYSTEM_ZONE));
            activeMap.put(transactionId, err);
            broadcastStatus(err);
            return err;
        }
    }

    private String resolveStripeSecretKey(AppSettings settings) {
        String platformKey = monetizationProperties.getStripePlatformSecretKey();
        if (platformKey != null && !platformKey.isBlank()) {
            return platformKey.trim();
        }
        if (settings != null && settings.getStripeSecretKey() != null && !settings.getStripeSecretKey().isBlank()) {
            return settings.getStripeSecretKey().trim();
        }
        return null;
    }

    private String resolveWebhookSecret() {
        String connectSecret = monetizationProperties.getStripeConnectWebhookSecret();
        if (connectSecret != null && !connectSecret.isBlank()) {
            return connectSecret.trim();
        }
        AppSettings settings = appSettingsService != null ? appSettingsService.getSettings() : null;
        return settings != null ? settings.getStripeWebhookSecret() : null;
    }

    private boolean isSimulatorAllowed(AppSettings settings) {
        return monetizationProperties.isStripeTerminalSimulatorFallback()
                || (settings != null && Boolean.TRUE.equals(settings.getTpeSimulatorEnabled()));
    }

    private void broadcastStatus(TpePaymentResponseDTO dto) {
        try {
            messagingTemplate.convertAndSend(PAYMENTS_TOPIC, dto);
        } catch (Exception ex) {
            log.warn("Failed to broadcast Stripe Terminal event over STOMP: {}", ex.getMessage());
        }
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException _) {
            Thread.currentThread().interrupt();
        }
    }
}
