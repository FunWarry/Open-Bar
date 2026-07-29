package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Record representing a single CSV row in accounting exports.
 */
public record FactureExportCSVRow(
    String invoiceNumber,
    LocalDateTime date,
    String tableRef,
    BigDecimal totalHT,
    BigDecimal vat20,
    BigDecimal vat10,
    BigDecimal vat55,
    BigDecimal totalVAT,
    BigDecimal totalTTC,
    String paymentMethod,
    String status
) {}
