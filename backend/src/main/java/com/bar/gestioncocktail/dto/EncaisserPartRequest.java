package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request payload for settling and recording an individual split share of an invoice.
 */
public record EncaisserPartRequest(
    @NotBlank(message = "Guest name or part identifier is mandatory")
    String nomConvive,

    int partIndex,

    Integer totalParts,

    @NotNull(message = "Settlement amount is mandatory")
    @Positive(message = "Settlement amount must be positive")
    BigDecimal montant,

    BigDecimal pourboire,

    @NotNull(message = "Total paid amount is mandatory")
    @Positive(message = "Total paid amount must be positive")
    BigDecimal totalRegle,

    @NotBlank(message = "Payment method is mandatory")
    String modePaiement,

    @NotBlank(message = "Split type (EGAL or SELECTION) is mandatory")
    String typeSplit,

    List<SplitResultDTO.SplitItemDTO> items,

    String tpeAutorisation,
    String tpeTerminalId,
    String tpeCardBrand,
    String tpeMaskedPan,
    String tpeSequence
) {
    /**
     * Backwards-compatible 9-parameter constructor before TPE fields were added.
     */
    public EncaisserPartRequest(
        String nomConvive,
        int partIndex,
        Integer totalParts,
        BigDecimal montant,
        BigDecimal pourboire,
        BigDecimal totalRegle,
        String modePaiement,
        String typeSplit,
        List<SplitResultDTO.SplitItemDTO> items
    ) {
        this(nomConvive, partIndex, totalParts, montant, pourboire, totalRegle, modePaiement, typeSplit, items, null, null, null, null, null);
    }
}

