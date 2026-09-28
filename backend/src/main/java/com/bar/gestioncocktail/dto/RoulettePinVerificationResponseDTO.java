package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Response payload confirming whether the entered PIN is valid for roulette TV display access.
 */
@Schema(description = "Verification response for roulette TV display access")
public record RoulettePinVerificationResponseDTO(
        @Schema(description = "Whether the provided PIN is valid", example = "true")
        boolean valid
) {
}
