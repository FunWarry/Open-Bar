package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;

/**
 * Data Transfer Object summarizing total amount and transaction count for a single payment method.
 *
 * @param modePaiement Name of payment mode (e.g. CARTE, ESPECES, CHECK)
 * @param count        Total number of transactions completed with this payment method
 * @param totalTtc     Total TTC amount collected via this payment method
 */
public record PaymentModeSummaryDTO(
    String modePaiement,
    long count,
    BigDecimal totalTtc
) {}
