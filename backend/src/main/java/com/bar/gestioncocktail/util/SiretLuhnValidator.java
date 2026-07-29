package com.bar.gestioncocktail.util;

/**
 * Utility for validating 14-digit French SIRET numbers using the Luhn algorithm.
 */
public final class SiretLuhnValidator {

    private SiretLuhnValidator() {
        // Utility class
    }

    /**
     * Checks whether the given string is a valid 14-digit SIRET number according to Luhn algorithm.
     *
     * @param siret the SIRET string to validate
     * @return true if valid, false otherwise
     */
    public static boolean isValidSiret(String siret) {
        if (siret == null || !siret.matches("^\\d{14}$")) {
            return false;
        }
        int sum = 0;
        for (int i = 0; i < 14; i++) {
            int digit = Character.getNumericValue(siret.charAt(i));
            if (i % 2 == 0) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
        }
        return sum % 10 == 0;
    }
}
