package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Request DTO for validating an ephemeral table session token.
 *
 * @param sessionToken The ephemeral token to validate
 */
@Schema(description = "Request payload for validating table session token")
public record TableSessionValidateRequestDTO(
        @Schema(description = "Ephemeral table session token", example = "4e389d44-0b1e-451e-b83b-9e236ceb348d")
        String sessionToken
) {
}
