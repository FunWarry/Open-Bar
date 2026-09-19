package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Detailed Data Transfer Object representing a customer bar tab with its full active orders,
 * consolidated item lines, tax breakdown, and elapsed duration.
 *
 * @param tab             Summary bar tab header information
 * @param activeCommandes List of active orders currently attached to this tab
 * @param items           Consolidated item lines with quantities and totals
 * @param totalHT         Calculated net amount excluding VAT
 * @param totalVAT        Calculated total VAT amount
 * @param totalTTC        Total gross amount including VAT
 * @param elapsedMinutes  Elapsed time in minutes since tab was opened
 */
public record BarTabDetailResponseDTO(
        BarTabResponseDTO tab,
        List<CommandeResponseDTO> activeCommandes,
        List<BarTabItemDTO> items,
        BigDecimal totalHT,
        BigDecimal totalVAT,
        BigDecimal totalTTC,
        long elapsedMinutes
) {
}
