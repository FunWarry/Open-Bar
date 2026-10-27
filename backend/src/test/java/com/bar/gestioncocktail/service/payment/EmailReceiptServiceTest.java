package com.bar.gestioncocktail.service.payment;

import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.service.AppSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link EmailReceiptService}.
 */
@ExtendWith(MockitoExtension.class)
class EmailReceiptServiceTest {

    @Mock
    private AppSettingsService appSettingsService;

    @InjectMocks
    private EmailReceiptService emailReceiptService;

    private AppSettings settings;

    @BeforeEach
    void setUp() {
        settings = new AppSettings();
        settings.setEstablishmentName("OpenBar");
    }

    @Test
    @DisplayName("sendReceiptPdf - returns false when email is null or blank")
    void sendReceiptPdf_emptyEmail_returnsFalse() {
        assertFalse(emailReceiptService.sendReceiptPdf(null, "FAC-001", new byte[]{}, "OpenBar"));
        assertFalse(emailReceiptService.sendReceiptPdf("   ", "FAC-001", new byte[]{}, "OpenBar"));
    }

    @Test
    @DisplayName("sendReceiptPdf - simulates success when SMTP host is unconfigured")
    void sendReceiptPdf_unconfiguredHost_simulatesSuccess() {
        when(appSettingsService.getSettings()).thenReturn(settings);

        boolean result = emailReceiptService.sendReceiptPdf("patron@example.com", "FAC-001", new byte[]{1, 2, 3}, "OpenBar");
        assertTrue(result);
    }

    @Test
    @DisplayName("sendReceiptPdf - handles exception gracefully when mail sending fails")
    void sendReceiptPdf_configuredHost_handlesNetworkFailureGracefully() {
        settings.setSmtpHost("127.0.0.1");
        settings.setSmtpPort(2525);
        settings.setSmtpUsername("test");
        settings.setSmtpPassword("secret");
        settings.setSmtpAuth(true);
        settings.setSmtpStarttls(false);
        when(appSettingsService.getSettings()).thenReturn(settings);

        // Sending to unreachable local port will catch MailException and return false cleanly
        boolean result = emailReceiptService.sendReceiptPdf("patron@example.com", "FAC-001", new byte[]{1, 2, 3}, "OpenBar");
        assertFalse(result);
    }
}
