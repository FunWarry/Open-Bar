package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CommandeStatut;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Request DTO for executing batch status transitions on order line items
 * during high-volume rush preparation rounds at the bar counter.
 *
 * @param itemIds    Explicit list of order item identifiers to transition
 * @param cocktailId Optional cocktail identifier to transition matching active drink items
 * @param statut     Target order status (e.g. EN_PREPARATION, PRET)
 */
public record BatchTransitionRequestDTO(
    List<Long> itemIds,
    Long cocktailId,
    @NotNull(message = "Target status is required")
    CommandeStatut statut
) {}
