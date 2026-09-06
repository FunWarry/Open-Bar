package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;
/**
 * Event payload dispatched when an ingredient stock level falls below critical threshold.
 */

public record StockAlerteEvent(
    Long ingredientId,
    String nom,
    String uniteMesure,
    BigDecimal quantiteActuelle,
    BigDecimal seuilAlerte,
    boolean stockNegatif
) {}
