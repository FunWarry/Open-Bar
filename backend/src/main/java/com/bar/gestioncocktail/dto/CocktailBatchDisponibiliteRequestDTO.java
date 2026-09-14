package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Request DTO for batch updating cocktail availability status.
 *
 * @param cocktailIds List of cocktail identifiers to update
 * @param disponible Target availability status (true = available, false = out of stock)
 */
@Schema(description = "Payload for updating availability status across multiple cocktails in batch")
public record CocktailBatchDisponibiliteRequestDTO(
    @Schema(description = "List of cocktail IDs to update", example = "[1, 2, 5]")
    @NotEmpty(message = "Cocktail IDs list cannot be empty")
    List<Long> cocktailIds,

    @Schema(description = "Target availability flag", example = "false")
    boolean disponible
) {
}
