package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload for a patron confirming departure and table liberation after full bill settlement.
 *
 * @param tableId Physical table identifier
 */
@Schema(description = "Request payload to confirm table liberation after full settlement")
public record LiberateTableRequestDTO(
        @NotNull(message = "Table ID is required")
        @Schema(description = "Table identifier", example = "4")
        Long tableId
) {}
