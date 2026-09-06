package com.bar.gestioncocktail.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Service providing accurate measurement unit conversions (volume, mass, discrete counts)
 * and recipe ingredient cost calculations between inventory purchasing units and drink recipe measures.
 */
public final class UnitConversionService {

    private static final Logger log = LoggerFactory.getLogger(UnitConversionService.class);
    private static final MathContext MC = new MathContext(10, RoundingMode.HALF_UP);

    private static final BigDecimal ONE_THOUSANDTH = new BigDecimal("0.001");
    private static final BigDecimal FIVE_THOUSANDTHS = new BigDecimal("0.005");
    private static final BigDecimal FIFTEEN_THOUSANDTHS = new BigDecimal("0.015");
    private static final BigDecimal ONE_MILLIONTH = new BigDecimal("0.000001");

    private static final Map<String, BigDecimal> VOLUME_TO_LITERS = new HashMap<>();
    private static final Map<String, BigDecimal> MASS_TO_KILOGRAMS = new HashMap<>();

    private UnitConversionService() {
        // Utility class with static conversion methods
    }

    static {
        // Volume conversions to base unit: Liters (l)
        VOLUME_TO_LITERS.put("l", BigDecimal.ONE);
        VOLUME_TO_LITERS.put("dl", new BigDecimal("0.1"));
        VOLUME_TO_LITERS.put("cl", new BigDecimal("0.01"));
        VOLUME_TO_LITERS.put("ml", ONE_THOUSANDTH);
        VOLUME_TO_LITERS.put("oz", new BigDecimal("0.03"));
        VOLUME_TO_LITERS.put("dash", ONE_THOUSANDTH);
        VOLUME_TO_LITERS.put("goutte", new BigDecimal("0.0005"));
        VOLUME_TO_LITERS.put("tsp", FIVE_THOUSANDTHS);
        VOLUME_TO_LITERS.put("tbsp", FIFTEEN_THOUSANDTHS);

        // Mass conversions to base unit: Kilograms (kg)
        MASS_TO_KILOGRAMS.put("kg", BigDecimal.ONE);
        MASS_TO_KILOGRAMS.put("g", ONE_THOUSANDTH);
        MASS_TO_KILOGRAMS.put("mg", ONE_MILLIONTH);
    }

    /**
     * Normalizes a unit string by trimming, lowercasing, stripping accents, and removing trailing plural 's'.
     *
     * @param unit the raw unit string
     * @return normalized unit identifier
     */
    public static String normalizeUnit(String unit) {
        if (unit == null) {
            return "";
        }
        String normalized = Normalizer.normalize(unit.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{M}", "");
        normalized = normalized.replace(".", "").replace("-", " ").replaceAll("\\s+", " ").trim();
        if (normalized.endsWith("s") && normalized.length() > 2 && !normalized.equals("cs") && !normalized.equals("ds")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    /**
     * Converts a given quantity from one unit of measurement to another.
     *
     * @param quantity the numerical quantity to convert
     * @param fromUnit source unit of measurement
     * @param toUnit   target unit of measurement
     * @return converted quantity in target unit
     */
    public static BigDecimal convert(BigDecimal quantity, String fromUnit, String toUnit) {
        if (quantity == null) {
            return BigDecimal.ZERO;
        }
        String normFrom = normalizeUnit(fromUnit);
        String normTo = normalizeUnit(toUnit);

        if (normFrom.isEmpty() || normTo.isEmpty() || normFrom.equals(normTo)) {
            return quantity;
        }

        // Both volume units
        if (VOLUME_TO_LITERS.containsKey(normFrom) && VOLUME_TO_LITERS.containsKey(normTo)) {
            BigDecimal fromInLiters = quantity.multiply(VOLUME_TO_LITERS.get(normFrom), MC);
            BigDecimal toFactor = VOLUME_TO_LITERS.get(normTo);
            return fromInLiters.divide(toFactor, 6, RoundingMode.HALF_UP);
        }

        // Both mass units
        if (MASS_TO_KILOGRAMS.containsKey(normFrom) && MASS_TO_KILOGRAMS.containsKey(normTo)) {
            BigDecimal fromInKg = quantity.multiply(MASS_TO_KILOGRAMS.get(normFrom), MC);
            BigDecimal toFactor = MASS_TO_KILOGRAMS.get(normTo);
            return fromInKg.divide(toFactor, 6, RoundingMode.HALF_UP);
        }

        // Fallback for identical categories (e.g. discrete count piece / tranche / zeste) or unknown pairs
        log.debug("Direct 1:1 unit conversion applied between '{}' and '{}'", fromUnit, toUnit);
        return quantity;
    }

    /**
     * Computes the ingredient cost for a recipe measure given the ingredient purchase unit cost.
     *
     * @param recipeQuantity     quantity required by the cocktail recipe
     * @param recipeUnit         unit used in the cocktail recipe
     * @param ingredientUnitCost unit purchase cost of the ingredient
     * @param ingredientUnit     unit corresponding to the purchase cost
     * @return the total ingredient line cost scaled to 4 decimal places
     */
    public static BigDecimal calculateCost(
            BigDecimal recipeQuantity,
            String recipeUnit,
            BigDecimal ingredientUnitCost,
            String ingredientUnit
    ) {
        if (recipeQuantity == null || ingredientUnitCost == null
                || recipeQuantity.compareTo(BigDecimal.ZERO) <= 0
                || ingredientUnitCost.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }

        BigDecimal convertedQuantity = convert(recipeQuantity, recipeUnit, ingredientUnit);
        return convertedQuantity.multiply(ingredientUnitCost, MC).setScale(4, RoundingMode.HALF_UP);
    }
}
