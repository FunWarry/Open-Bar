package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.VatRate;
import java.math.BigDecimal;

/**
 * Data Transfer Object summarizing tax breakdown per VAT rate for closing and monthly reports.
 *
 * @param rate       Optional VatRate enum
 * @param tauxLabel  Label of the VAT rate (e.g., "5.5%", "10.0%", "20.0%")
 * @param baseHt     Taxable base amount excluding VAT
 * @param montantTva Calculated VAT tax amount
 * @param totalTtc   Total amount including VAT
 */
public record VatSummaryDTO(
    VatRate rate,
    String tauxLabel,
    BigDecimal baseHt,
    BigDecimal montantTva,
    BigDecimal totalTtc
) {
    public VatSummaryDTO(String tauxLabel, BigDecimal baseHt, BigDecimal montantTva, BigDecimal totalTtc) {
        this(null, tauxLabel, baseHt, montantTva, totalTtc);
    }
}
