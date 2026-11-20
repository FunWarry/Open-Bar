package com.bar.gestioncocktail.service.monetization;

import com.bar.gestioncocktail.config.MonetizationProperties;
import com.bar.gestioncocktail.dto.CommissionTierRatesDTO;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.TpeMonetizationTier;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import com.bar.gestioncocktail.service.LicenseCryptoService;
import com.bar.gestioncocktail.service.LicenseService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

/**
 * Dual-tier commission rate resolver and calculator supporting Option 1 (Concert IP offline)
 * and Option 3 (Stripe Terminal Connect) per-establishment rate schedules.
 */
@Service
public class CommissionCalculator {

    private static final BigDecimal BPS_DIVISOR = new BigDecimal("10000");
    private static final BigDecimal CENTS_DIVISOR = new BigDecimal("100");

    private final MonetizationProperties monetizationProperties;
    private final LicenseService licenseService;
    private final EstablishmentConfigService establishmentConfigService;
    private final AppSettingsService appSettingsService;

    /**
     * Constructs CommissionCalculator with required configuration and licensing dependencies.
     *
     * @param monetizationProperties     Platform monetization defaults
     * @param licenseService             Licensing service providing signed JWT overrides
     * @param establishmentConfigService Modular capability flag service
     * @param appSettingsService         Establishment settings service
     */
    public CommissionCalculator(
            MonetizationProperties monetizationProperties,
            LicenseService licenseService,
            EstablishmentConfigService establishmentConfigService,
            AppSettingsService appSettingsService) {
        this.monetizationProperties = monetizationProperties;
        this.licenseService = licenseService;
        this.establishmentConfigService = establishmentConfigService;
        this.appSettingsService = appSettingsService;
    }

    /**
     * Resolves the effective dual-tier rate schedule and active TPE hardware mode for this venue.
     * Signed JWT license claims override local configuration defaults to prevent client tampering.
     *
     * @return Effective {@link CommissionTierRatesDTO}
     */
    public CommissionTierRatesDTO resolveEffectiveRates() {
        Optional<LicenseCryptoService.LicenseMonetizationClaims> claimsOpt =
                licenseService != null ? licenseService.getActiveMonetizationClaims() : Optional.empty();

        int opt1Rate = monetizationProperties.getOption1RateBps();
        int opt1Fixed = monetizationProperties.getOption1FixedCents();
        int opt3Rate = monetizationProperties.getOption3RateBps();
        int opt3Fixed = monetizationProperties.getOption3FixedCents();
        TpeMonetizationTier activeTier = monetizationProperties.getDefaultTier();

        boolean stripeModuleEnabled = establishmentConfigService == null
                || establishmentConfigService.isModuleEnabled(EstablishmentModule.STRIPE_TERMINAL_CONNECT);

        AppSettings settings = appSettingsService != null ? appSettingsService.getSettings() : null;
        String hardwareMode = settings != null ? settings.getTpeMonetizationMode() : "CONCERT_IP";
        boolean connectAccountConfigured = settings != null
                && settings.getStripeConnectedAccountId() != null
                && !settings.getStripeConnectedAccountId().isBlank();

        if ("STRIPE_TERMINAL".equalsIgnoreCase(hardwareMode) && stripeModuleEnabled) {
            activeTier = TpeMonetizationTier.STRIPE_TERMINAL_CONNECT;
        } else {
            activeTier = TpeMonetizationTier.CONCERT_IP_OFFLINE;
        }

        if (claimsOpt.isPresent()) {
            LicenseCryptoService.LicenseMonetizationClaims c = claimsOpt.get();
            if (c.option1RateBps() != null && c.option1RateBps() >= 0) {
                opt1Rate = c.option1RateBps();
            }
            if (c.option1FixedCents() != null && c.option1FixedCents() >= 0) {
                opt1Fixed = c.option1FixedCents();
            }
            if (c.option3RateBps() != null && c.option3RateBps() >= 0) {
                opt3Rate = c.option3RateBps();
            }
            if (c.option3FixedCents() != null && c.option3FixedCents() >= 0) {
                opt3Fixed = c.option3FixedCents();
            }
            if (c.tpeTier() != null) {
                activeTier = parseTierOrDefault(c.tpeTier(), activeTier);
            }
        }

        return new CommissionTierRatesDTO(
                activeTier,
                opt1Rate,
                opt1Fixed,
                opt3Rate,
                opt3Fixed,
                hardwareMode,
                stripeModuleEnabled,
                connectAccountConfigured
        );
    }

    /**
     * Calculates the platform commission amount in currency units for a given gross transaction and tier.
     *
     * @param grossAmount Gross card payment amount
     * @param tier        Target monetization tier
     * @return Commission breakdown including applied rate, fixed fee, and rounded commission amount
     */
    public CommissionCalculation calculateForTier(BigDecimal grossAmount, TpeMonetizationTier tier) {
        CommissionTierRatesDTO rates = resolveEffectiveRates();
        int rateBps = tier == TpeMonetizationTier.STRIPE_TERMINAL_CONNECT
                ? rates.option3RateBps()
                : rates.option1RateBps();
        int fixedCents = tier == TpeMonetizationTier.STRIPE_TERMINAL_CONNECT
                ? rates.option3FixedCents()
                : rates.option1FixedCents();
        BigDecimal commission = computeCommissionAmount(grossAmount, rateBps, fixedCents);
        long commissionCents = commission.multiply(CENTS_DIVISOR).setScale(0, RoundingMode.HALF_UP).longValueExact();
        return new CommissionCalculation(rateBps, fixedCents, commission, commissionCents);
    }

    /**
     * Pure arithmetic formula: {@code roundHalfUp(gross * rateBps / 10000 + fixedCents / 100)}.
     *
     * @param grossAmount Gross card amount (must be positive to accrue fixed fee)
     * @param rateBps     Percentage fee in basis points
     * @param fixedCents  Fixed fee in cents
     * @return Computed commission rounded to 2 decimal places
     */
    public BigDecimal computeCommissionAmount(BigDecimal grossAmount, int rateBps, int fixedCents) {
        if (grossAmount == null || grossAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal percentagePart = grossAmount
                .multiply(BigDecimal.valueOf(Math.max(0, rateBps)))
                .divide(BPS_DIVISOR, 6, RoundingMode.HALF_UP);
        BigDecimal fixedPart = BigDecimal.valueOf(Math.max(0, fixedCents))
                .divide(CENTS_DIVISOR, 6, RoundingMode.HALF_UP);
        return percentagePart.add(fixedPart).setScale(2, RoundingMode.HALF_UP);
    }

    private TpeMonetizationTier parseTierOrDefault(String raw, TpeMonetizationTier fallback) {
        try {
            return TpeMonetizationTier.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException _) {
            return fallback;
        }
    }

    /**
     * Result record of a single transaction commission calculation.
     *
     * @param rateBps        Applied basis points rate
     * @param fixedFeeCents  Applied fixed fee in cents
     * @param commission     Commission amount in decimal currency
     * @param commissionCents Commission amount in integer cents (used for Stripe application_fee_amount)
     */
    public record CommissionCalculation(
            int rateBps,
            int fixedFeeCents,
            BigDecimal commission,
            long commissionCents
    ) {
    }
}
