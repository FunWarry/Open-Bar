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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link CommissionCalculator}.
 */
@ExtendWith(MockitoExtension.class)
class CommissionCalculatorTest {

    @Mock
    private LicenseService licenseService;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private AppSettingsService appSettingsService;

    private MonetizationProperties properties;
    private CommissionCalculator calculator;
    private AppSettings settings;

    @BeforeEach
    void setUp() {
        properties = new MonetizationProperties();
        settings = new AppSettings();
        settings.setTpeMonetizationMode("CONCERT_IP");
        calculator = new CommissionCalculator(properties, licenseService, establishmentConfigService, appSettingsService);
    }

    @Test
    @DisplayName("resolveEffectiveRates - resolves Option 1 defaults when CONCERT_IP mode is active")
    void resolveEffectiveRates_option1Defaults() {
        when(licenseService.getActiveMonetizationClaims()).thenReturn(Optional.empty());
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.STRIPE_TERMINAL_CONNECT)).thenReturn(true);
        when(appSettingsService.getSettings()).thenReturn(settings);

        CommissionTierRatesDTO rates = calculator.resolveEffectiveRates();

        assertEquals(TpeMonetizationTier.CONCERT_IP_OFFLINE, rates.activeTier());
        assertEquals(120, rates.option1RateBps());
        assertEquals(10, rates.option1FixedCents());
        assertEquals(45, rates.option3RateBps());
        assertEquals(5, rates.option3FixedCents());
    }

    @Test
    @DisplayName("resolveEffectiveRates - switches to Option 3 when STRIPE_TERMINAL is selected and module enabled")
    void resolveEffectiveRates_option3WhenEnabled() {
        settings.setTpeMonetizationMode("STRIPE_TERMINAL");
        settings.setStripeConnectedAccountId("acct_12345");
        when(licenseService.getActiveMonetizationClaims()).thenReturn(Optional.empty());
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.STRIPE_TERMINAL_CONNECT)).thenReturn(true);
        when(appSettingsService.getSettings()).thenReturn(settings);

        CommissionTierRatesDTO rates = calculator.resolveEffectiveRates();

        assertEquals(TpeMonetizationTier.STRIPE_TERMINAL_CONNECT, rates.activeTier());
        assertTrue(rates.stripeTerminalModuleEnabled());
        assertTrue(rates.stripeConnectAccountConfigured());
    }

    @Test
    @DisplayName("resolveEffectiveRates - signed JWT claims override local property rates")
    void resolveEffectiveRates_jwtClaimsOverrideDefaults() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.STRIPE_TERMINAL_CONNECT)).thenReturn(true);
        when(appSettingsService.getSettings()).thenReturn(settings);
        when(licenseService.getActiveMonetizationClaims()).thenReturn(Optional.of(
                new LicenseCryptoService.LicenseMonetizationClaims(
                        "STRIPE_TERMINAL_CONNECT", 150, 15, 35, 3, null, null, null, null
                )
        ));

        CommissionTierRatesDTO rates = calculator.resolveEffectiveRates();

        assertEquals(TpeMonetizationTier.STRIPE_TERMINAL_CONNECT, rates.activeTier());
        assertEquals(150, rates.option1RateBps());
        assertEquals(15, rates.option1FixedCents());
        assertEquals(35, rates.option3RateBps());
        assertEquals(3, rates.option3FixedCents());
    }

    @Test
    @DisplayName("calculateForTier - differentiates Option 1 (1.2% + 0.10€) vs Option 3 (0.45% + 0.05€)")
    void calculateForTier_differentiatesOption1VsOption3() {
        when(licenseService.getActiveMonetizationClaims()).thenReturn(Optional.empty());
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.STRIPE_TERMINAL_CONNECT)).thenReturn(true);
        when(appSettingsService.getSettings()).thenReturn(settings);

        CommissionCalculator.CommissionCalculation opt1 =
                calculator.calculateForTier(new BigDecimal("100.00"), TpeMonetizationTier.CONCERT_IP_OFFLINE);
        CommissionCalculator.CommissionCalculation opt3 =
                calculator.calculateForTier(new BigDecimal("100.00"), TpeMonetizationTier.STRIPE_TERMINAL_CONNECT);

        assertEquals(new BigDecimal("1.30"), opt1.commission());
        assertEquals(130L, opt1.commissionCents());

        assertEquals(new BigDecimal("0.50"), opt3.commission());
        assertEquals(50L, opt3.commissionCents());
    }

    @Test
    @DisplayName("computeCommissionAmount - returns 0.00 for zero or negative amounts")
    void computeCommissionAmount_nonPositive_returnsZero() {
        assertEquals(new BigDecimal("0.00"), calculator.computeCommissionAmount(BigDecimal.ZERO, 120, 10));
        assertEquals(new BigDecimal("0.00"), calculator.computeCommissionAmount(new BigDecimal("-5.00"), 120, 10));
        assertEquals(new BigDecimal("0.00"), calculator.computeCommissionAmount(null, 120, 10));
    }
}
