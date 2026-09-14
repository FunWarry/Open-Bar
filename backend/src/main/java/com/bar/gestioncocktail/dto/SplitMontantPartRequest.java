package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request DTO representing an individual guest's custom allocated amount in a bill split.
 *
 * @param nomConvive Name or identifier of the guest
 * @param montant    Monetary amount allocated to this guest
 */
@Schema(description = "Individual guest custom amount allocation in a bill split")
public record SplitMontantPartRequest(
    @Schema(description = "Name or label of the guest", example = "Guest 1")
    @NotBlank(message = "Guest name must not be blank")
    String nomConvive,

    @Schema(description = "Allocated monetary amount", example = "25.00")
    @NotNull(message = "Amount must not be null")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    BigDecimal montant
) {}
