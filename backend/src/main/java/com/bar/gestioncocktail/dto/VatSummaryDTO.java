package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.VatRate;
import java.math.BigDecimal;

/**
 * Summary DTO grouping base HT, VAT amount, and total TTC for a specific VAT rate.
 */
public record VatSummaryDTO(
    VatRate vatRate,
    String rateLabel,
    BigDecimal baseHT,
    BigDecimal vatAmount,
    BigDecimal totalTTC
) {}
