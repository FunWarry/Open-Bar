package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TpeMonetizationTier;

/**
 * Effective dual-tier TPE commission rate schedule resolved from signed license claims
 * and establishment platform configuration.
 *
 * @param activeTier                     Active establishment monetization tier
 * @param option1RateBps                 Option 1 percentage fee in basis points (e.g. 120 = 1.20%)
 * @param option1FixedCents              Option 1 fixed fee per transaction in cents (e.g. 10 = €0.10)
 * @param option3RateBps                 Option 3 percentage fee in basis points (e.g. 45 = 0.45%)
 * @param option3FixedCents              Option 3 fixed fee per transaction in cents (e.g. 5 = €0.05)
 * @param tpeHardwareMode                Configured TPE hardware mode ("CONCERT_IP" or "STRIPE_TERMINAL")
 * @param stripeTerminalModuleEnabled    Whether Option 3 Stripe Terminal Connect module is enabled and licensed
 * @param stripeConnectAccountConfigured Whether a Stripe Connect destination account ID is configured
 */
public record CommissionTierRatesDTO(
        TpeMonetizationTier activeTier,
        int option1RateBps,
        int option1FixedCents,
        int option3RateBps,
        int option3FixedCents,
        String tpeHardwareMode,
        boolean stripeTerminalModuleEnabled,
        boolean stripeConnectAccountConfigured
) {
}
