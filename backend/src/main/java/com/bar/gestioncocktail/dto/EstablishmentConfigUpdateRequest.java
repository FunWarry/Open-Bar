package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Input request record for updating legal establishment configuration.
 */
public record EstablishmentConfigUpdateRequest(
    @NotBlank(message = "The legal name is required")
    @Size(max = 255, message = "Legal name cannot exceed 255 characters")
    String legalName,

    @Size(max = 50, message = "Legal form cannot exceed 50 characters")
    String legalForm,

    @Pattern(regexp = "^\\d{14}$", message = "SIRET must consist of 14 digits")
    String siret,

    @Size(max = 100, message = "RCS city cannot exceed 100 characters")
    String rcsCity,

    @Size(max = 50, message = "RCS number cannot exceed 50 characters")
    String rcsNumber,

    @Pattern(regexp = "^FR[0-9A-Z]{2}\\d{9}$", message = "Invalid French TVA number format")
    String tvaNumber,

    @Pattern(regexp = "^\\d{4}[A-Z]$", message = "Invalid APE code format")
    String codeApe,

    BigDecimal capitalSocial,

    @Size(max = 500, message = "Address cannot exceed 500 characters")
    String address,

    @Size(max = 50, message = "Phone number cannot exceed 50 characters")
    String phone,

    @Size(max = 100, message = "Email cannot exceed 100 characters")
    String email,

    @Size(max = 255, message = "Payment terms cannot exceed 255 characters")
    String paymentTerms,

    @Size(max = 255, message = "Discount policy cannot exceed 255 characters")
    String discountPolicy,

    BigDecimal latePaymentRate,

    @Size(max = 50, message = "Time zone cannot exceed 50 characters")
    String timeZone
) {
}
