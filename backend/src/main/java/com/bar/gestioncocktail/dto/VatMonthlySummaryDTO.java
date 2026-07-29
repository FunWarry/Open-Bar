package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Monthly VAT summary record for French CA3 tax declarations.
 */
public record VatMonthlySummaryDTO(
    String period,
    BigDecimal totalHT,
    Map<String, VatSummaryDTO> vatByRate,
    BigDecimal totalVAT,
    BigDecimal totalTTC
) {}
