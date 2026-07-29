package com.bar.gestioncocktail.model;

import java.math.BigDecimal;

/**
 * Enumeration of standard French VAT rates applicable to food & beverages.
 */
public enum VatRate {
    TWENTY(new BigDecimal("0.20"), "20%"),
    TEN(new BigDecimal("0.10"), "10%"),
    FIVE_FIVE(new BigDecimal("0.055"), "5.5%");

    private final BigDecimal rate;
    private final String label;

    VatRate(BigDecimal rate, String label) {
        this.rate = rate;
        this.label = label;
    }

    public BigDecimal getRate() {
        return rate;
    }

    public String getLabel() {
        return label;
    }
}
