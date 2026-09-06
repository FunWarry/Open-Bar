package com.bar.gestioncocktail.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Comprehensive unit tests for {@link UnitConversionService}.
 */
class UnitConversionServiceTest {

    @Test
    @DisplayName("normalizeUnit - trims, lowercases, removes accents and trailing plurals")
    void normalizeUnit_nominalAndEdgeCases() {
        assertThat(UnitConversionService.normalizeUnit(null)).isEmpty();
        assertThat(UnitConversionService.normalizeUnit("")).isEmpty();
        assertThat(UnitConversionService.normalizeUnit("   ")).isEmpty();
        assertThat(UnitConversionService.normalizeUnit("Litres")).isEqualTo("litre");
        assertThat(UnitConversionService.normalizeUnit("  cL  ")).isEqualTo("cl");
        assertThat(UnitConversionService.normalizeUnit("Cuillère à Soupe")).isEqualTo("cuillere a soupe");
        assertThat(UnitConversionService.normalizeUnit("cs")).isEqualTo("cs");
        assertThat(UnitConversionService.normalizeUnit("ds")).isEqualTo("ds");
        assertThat(UnitConversionService.normalizeUnit("Gouttes")).isEqualTo("goutte");
        assertThat(UnitConversionService.normalizeUnit("Tranches")).isEqualTo("tranche");
        assertThat(UnitConversionService.normalizeUnit("c. à c.")).isEqualTo("c a c");
    }

    @Test
    @DisplayName("convert - handles null quantity gracefully")
    void convert_nullQuantity_returnsZero() {
        BigDecimal result = UnitConversionService.convert(null, "cl", "l");
        assertThat(result).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("convert - same or empty unit returns original quantity")
    void convert_sameOrEmptyUnit_returnsOriginalQuantity() {
        BigDecimal qty = new BigDecimal("4.50");
        assertThat(UnitConversionService.convert(qty, "cl", "cl")).isEqualTo(qty);
        assertThat(UnitConversionService.convert(qty, null, "cl")).isEqualTo(qty);
        assertThat(UnitConversionService.convert(qty, "cl", "")).isEqualTo(qty);
    }

    @ParameterizedTest
    @CsvSource({
        "5, cl, l, 0.050000",
        "1000, ml, l, 1.000000",
        "1, l, cl, 100.000000",
        "2, dl, cl, 20.000000",
        "1, oz, ml, 30.000000",
        "2, dash, ml, 2.000000",
        "1, tbsp, ml, 15.000000",
        "3, tsp, ml, 15.000000"
    })
    @DisplayName("convert - volume conversions correctly calculate factors")
    void convert_volumeConversions(String qty, String from, String to, String expected) {
        BigDecimal converted = UnitConversionService.convert(new BigDecimal(qty), from, to);
        assertThat(converted).isEqualByComparingTo(new BigDecimal(expected));
    }

    @ParameterizedTest
    @CsvSource({
        "500, g, kg, 0.500000",
        "1, kg, g, 1000.000000",
        "2000, mg, g, 2.000000",
        "5, g, kg, 0.005000"
    })
    @DisplayName("convert - mass conversions correctly calculate factors")
    void convert_massConversions(String qty, String from, String to, String expected) {
        BigDecimal initialQty = new BigDecimal(qty);
        BigDecimal converted = UnitConversionService.convert(initialQty, from, to);
        assertThat(converted)
                .as("Converting %s %s to %s", qty, from, to)
                .isEqualByComparingTo(new BigDecimal(expected));
    }

    @Test
    @DisplayName("convert - discrete or unknown units return identity conversion")
    void convert_discreteOrUnknownUnits_returnsQuantity() {
        BigDecimal qty = new BigDecimal("2");
        assertThat(UnitConversionService.convert(qty, "tranche", "piece")).isEqualTo(qty);
        assertThat(UnitConversionService.convert(qty, "feuille", "unite")).isEqualTo(qty);
    }

    @Test
    @DisplayName("calculateCost - returns zero for null or negative inputs")
    void calculateCost_nullOrNegativeInputs_returnsZeroScaled() {
        assertThat(UnitConversionService.calculateCost(null, "cl", new BigDecimal("10.00"), "l"))
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(UnitConversionService.calculateCost(new BigDecimal("5"), "cl", null, "l"))
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(UnitConversionService.calculateCost(BigDecimal.ZERO, "cl", new BigDecimal("10.00"), "l"))
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(UnitConversionService.calculateCost(new BigDecimal("-5"), "cl", new BigDecimal("10.00"), "l"))
                .isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(UnitConversionService.calculateCost(new BigDecimal("5"), "cl", new BigDecimal("-10.00"), "l"))
                .isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("calculateCost - calculates cost accurately across units")
    void calculateCost_crossUnitCalculation() {
        // Recipe needs 5 cl Rum, inventory purchased at 20 €/L
        // 5 cl = 0.05 L => 0.05 * 20 = 1.0000 €
        BigDecimal cost = UnitConversionService.calculateCost(
                new BigDecimal("5"), "cl",
                new BigDecimal("20.00"), "l"
        );
        assertThat(cost).isEqualByComparingTo(new BigDecimal("1.0000"));

        // Recipe needs 20 g Sugar, purchased at 2 €/kg
        // 20 g = 0.02 kg => 0.02 * 2 = 0.0400 €
        BigDecimal sugarCost = UnitConversionService.calculateCost(
                new BigDecimal("20"), "g",
                new BigDecimal("2.00"), "kg"
        );
        assertThat(sugarCost).isEqualByComparingTo(new BigDecimal("0.0400"));

        // Recipe needs 1 slice lemon, purchased at 0.15 €/piece
        BigDecimal lemonCost = UnitConversionService.calculateCost(
                new BigDecimal("1"), "tranche",
                new BigDecimal("0.15"), "piece"
        );
        assertThat(lemonCost).isEqualByComparingTo(new BigDecimal("0.1500"));
    }
}
