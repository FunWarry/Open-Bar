package com.bar.gestioncocktail.service.payment;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Stripe payment gateway provider implementation using the official Stripe Java SDK.
 * Manages PaymentIntent lifecycle, Stripe Elements client secrets, automatic payment methods
 * (Apple Pay, Google Pay, Cards), and HMAC-SHA256 webhook signature verification.
 */
@Component
public class StripePaymentProvider implements PaymentGatewayProvider {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentProvider.class);
    public static final String PROVIDER_NAME = "STRIPE";

    private final AppSettingsService appSettingsService;

    /**
     * Constructor injection.
     *
     * @param appSettingsService Settings service to retrieve configured Stripe API keys
     */
    public StripePaymentProvider(AppSettingsService appSettingsService) {
        this.appSettingsService = appSettingsService;
    }

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public boolean isAvailable() {
        AppSettings settings = appSettingsService.getSettings();
        return settings.getStripeSecretKey() != null && !settings.getStripeSecretKey().isBlank();
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
        AppSettings settings = appSettingsService.getSettings();
        String secretKey = settings.getStripeSecretKey();
        if (secretKey == null || secretKey.isBlank()) {
            throw new BusinessException("Stripe secret key is not configured for this establishment.");
        }

        BigDecimal safeTip = tip != null ? tip : BigDecimal.ZERO;
        BigDecimal totalAmount = amount.add(safeTip);
        long amountInCents = totalAmount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValueExact();
        String cur = currency != null ? currency.toLowerCase() : "eur";

        try {
            PaymentIntentCreateParams.Builder paramsBuilder = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency(cur)
                    .putMetadata("tableId", String.valueOf(tableId))
                    .putMetadata("typeSplit", typeSplit != null ? typeSplit : "TOTALITE")
                    .putMetadata("guestName", guestName != null ? guestName : "")
                    .putMetadata("baseAmount", amount.toPlainString())
                    .putMetadata("tipAmount", safeTip.toPlainString())
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .build()
                    );

            RequestOptions requestOptions = RequestOptions.builder()
                    .setApiKey(secretKey)
                    .setIdempotencyKey(idempotencyKey)
                    .build();

            PaymentIntent intent = PaymentIntent.create(paramsBuilder.build(), requestOptions);
            log.info("Created Stripe PaymentIntent {} for table {} (total: {} {})", intent.getId(), tableId, totalAmount, cur);

            return new PaymentIntentResult(
                    intent.getId(),
                    intent.getClientSecret(),
                    amount,
                    safeTip,
                    totalAmount,
                    cur.toUpperCase(),
                    PROVIDER_NAME,
                    settings.getStripePublishableKey()
            );
        } catch (StripeException e) {
            log.error("Failed to create Stripe PaymentIntent for table {}: {}", tableId, e.getMessage(), e);
            throw new BusinessException("Payment gateway error: " + e.getMessage());
        }
    }

    @Override
    public PaymentWebhookResult parseAndVerifyWebhook(String payload, String signatureHeader) {
        AppSettings settings = appSettingsService.getSettings();
        String webhookSecret = settings.getStripeWebhookSecret();
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new BusinessException("Stripe webhook signing secret is not configured.");
        }

        Event event;
        try {
            event = Webhook.constructEvent(payload, signatureHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            throw new BusinessException("Invalid Stripe webhook signature.");
        }

        log.info("Received validated Stripe webhook event: {}", event.getType());

        if ("payment_intent.succeeded".equals(event.getType())) {
            EventDataObjectDeserializer dataObjectDeserializer = event.getDataObjectDeserializer();
            StripeObject stripeObject = dataObjectDeserializer.getObject().orElse(null);
            if (stripeObject instanceof PaymentIntent paymentIntent) {
                BigDecimal settledAmount = BigDecimal.valueOf(paymentIntent.getAmountReceived())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                String paymentMethod = paymentIntent.getPaymentMethodTypes() != null && !paymentIntent.getPaymentMethodTypes().isEmpty()
                        ? paymentIntent.getPaymentMethodTypes().get(0)
                        : "card";

                return new PaymentWebhookResult(
                        paymentIntent.getId(),
                        "SUCCEEDED",
                        paymentMethod,
                        settledAmount,
                        paymentIntent.getCurrency() != null ? paymentIntent.getCurrency().toUpperCase() : "EUR",
                        paymentIntent.getReceiptEmail()
                );
            }
        }

        return new PaymentWebhookResult(
                null,
                "IGNORED",
                null,
                BigDecimal.ZERO,
                "EUR",
                null
        );
    }
}
