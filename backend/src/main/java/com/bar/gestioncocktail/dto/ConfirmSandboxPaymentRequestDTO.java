package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for confirming a sandbox simulation payment transaction.
 *
 * @param transactionId Target transaction identifier
 * @param clientSecret Client secret previously generated for verification
 * @param paymentMethodType Simulated payment method ('card', 'apple_pay', 'google_pay')
 */
@Schema(description = "Request payload to confirm a simulated sandbox payment")
public record ConfirmSandboxPaymentRequestDTO(
        @NotBlank(message = "Transaction ID is required")
        @Schema(description = "Sandbox transaction ID", example = "sandbox_pi_12345")
        String transactionId,

        @NotBlank(message = "Client secret is required")
        @Schema(description = "Secret generated during intent creation")
        String clientSecret,

        @Schema(description = "Simulated payment method type", example = "apple_pay")
        String paymentMethodType
) {}
