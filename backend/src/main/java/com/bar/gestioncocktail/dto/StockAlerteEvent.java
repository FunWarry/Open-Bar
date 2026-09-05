package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;

public record StockAlerteEvent(
    Long ingredientId,
    String nom,
    String uniteMesure,
    BigDecimal quantiteActuelle,
    BigDecimal seuilAlerte,
    boolean stockNegatif
) {}
