package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request DTO representing an individual guest's custom percentage allocation in a bill split.
 *
 * @param nomConvive  Name or identifier of the guest
 * @param pourcentage Percentage allocated to this guest (0.01 to 100.00)
 */
@Schema(description = "Individual guest percentage allocation in a bill split")
public record SplitPourcentagePartRequest(
    @Schema(description = "Name or label of the guest", example = "Guest 1")
    @NotBlank(message = "Guest name must not be blank")
    String nomConvive,

    @Schema(description = "Allocated percentage", example = "50.0")
    @NotNull(message = "Percentage must not be null")
    @DecimalMin(value = "0.01", message = "Percentage must be greater than zero")
    @DecimalMax(value = "100.00", message = "Percentage must not exceed 100")
    BigDecimal pourcentage
) {}
