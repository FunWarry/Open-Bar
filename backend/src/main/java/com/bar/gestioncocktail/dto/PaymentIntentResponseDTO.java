package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Output DTO returned upon successful PaymentIntent creation, containing the client secret
 * required to mount Stripe Elements or execute Sandbox simulation.
 *
 * @param transactionId Unique transaction reference (e.g. Stripe PaymentIntent ID 'pi_...' or 'sandbox_...')
 * @param clientSecret Client secret for Stripe Elements initialization or verification
 * @param amount Base amount paid (excluding tip)
 * @param tip Tip amount
 * @param totalCharged Total amount charged (amount + tip)
 * @param currency Transaction currency code (e.g. 'EUR')
 * @param provider Gateway provider ('STRIPE' or 'SANDBOX')
 * @param publishableKey Public gateway key for client SDK initialization
 */
@Schema(description = "Response returned upon payment intent creation for client-side payment execution")
public record PaymentIntentResponseDTO(
        @Schema(description = "Transaction reference", example = "pi_3Nxyz123456789")
        String transactionId,

        @Schema(description = "Client secret for Stripe Elements or simulation confirmation")
        String clientSecret,

        @Schema(description = "Base amount", example = "15.00")
        BigDecimal amount,

        @Schema(description = "Tip amount", example = "2.00")
        BigDecimal tip,

        @Schema(description = "Total charged amount", example = "17.00")
        BigDecimal totalCharged,

        @Schema(description = "Currency", example = "EUR")
        String currency,

        @Schema(description = "Gateway provider ('STRIPE' or 'SANDBOX')", example = "STRIPE")
        String provider,

        @Schema(description = "Stripe publishable key (null in Sandbox)")
        String publishableKey
) {}
