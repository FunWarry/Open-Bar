package com.bar.gestioncocktail.service.payment;

import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.service.AppSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link StripePaymentProvider}.
 */
@ExtendWith(MockitoExtension.class)
class StripePaymentProviderTest {

    @Mock
    private AppSettingsService appSettingsService;

    @InjectMocks
    private StripePaymentProvider provider;

    private AppSettings settings;

    @BeforeEach
    void setUp() {
        settings = new AppSettings();
    }

    @Test
    @DisplayName("getProviderName - returns STRIPE")
    void getProviderName_returnsStripe() {
        assertEquals("STRIPE", provider.getProviderName());
    }

    @Test
    @DisplayName("isAvailable - returns true only when secret key is present")
    void isAvailable_checksSecretKey() {
        when(appSettingsService.getSettings()).thenReturn(settings);

        assertFalse(provider.isAvailable());

        settings.setStripeSecretKey("sk_test_12345");
        assertTrue(provider.isAvailable());
    }

    @Test
    @DisplayName("createPaymentIntent - throws BusinessException when secret key is unconfigured")
    void createPaymentIntent_unconfigured_throwsException() {
        when(appSettingsService.getSettings()).thenReturn(settings);

        assertThrows(BusinessException.class, () -> provider.createPaymentIntent(
                1L,
                BigDecimal.TEN,
                BigDecimal.ONE,
                "EUR",
                "key-1",
                "Alex",
                "FULL"
        ));
    }

    @Test
    @DisplayName("parseAndVerifyWebhook - throws BusinessException when webhook secret is missing")
    void parseAndVerifyWebhook_missingSecret_throwsException() {
        when(appSettingsService.getSettings()).thenReturn(settings);

        assertThrows(BusinessException.class, () -> provider.parseAndVerifyWebhook("{}", "sig"));
    }

    @Test
    @DisplayName("parseAndVerifyWebhook - throws BusinessException when signature is invalid")
    void parseAndVerifyWebhook_invalidSignature_throwsException() {
        settings.setStripeWebhookSecret("whsec_test_secret");
        when(appSettingsService.getSettings()).thenReturn(settings);

        assertThrows(BusinessException.class, () -> provider.parseAndVerifyWebhook("{}", "invalid_sig"));
    }
}
