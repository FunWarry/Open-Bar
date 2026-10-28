package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for dispatching an invoice receipt via email to a patron.
 *
 * @param email Recipient email address
 */
@Schema(description = "Payload to request digital receipt email dispatch")
public record SendReceiptEmailRequestDTO(
        @NotBlank(message = "Recipient email is required")
        @Email(message = "Invalid email format")
        @Schema(description = "Customer email address", example = "customer@example.com")
        String email
) {}
