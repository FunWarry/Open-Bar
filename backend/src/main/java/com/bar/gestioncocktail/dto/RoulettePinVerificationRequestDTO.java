package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request payload for verifying a 4-digit PIN to access the roulette display screen.
 */
@Schema(description = "Request payload for roulette TV display PIN verification")
public record RoulettePinVerificationRequestDTO(
        @NotBlank(message = "PIN cannot be blank")
        @Pattern(regexp = "^\\d{4}$", message = "PIN must be exactly 4 digits")
        @Schema(description = "4-digit display PIN code", example = "7777")
        String pin
) {
}
