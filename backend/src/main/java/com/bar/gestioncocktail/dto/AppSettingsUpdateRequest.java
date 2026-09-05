package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CurrencyPosition;
import com.bar.gestioncocktail.model.DefaultTheme;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for updating establishment settings.
 *
 * @param primaryColor Primary color (#RRGGBB)
 * @param primaryColorStrong Strong primary accent color (#RRGGBB)
 * @param logoUrl Establishment logo URL
 * @param establishmentName Commercial name of the establishment
 * @param defaultTheme Default UI theme
 * @param currencyCode ISO 4217 3-letter currency code (e.g. EUR, USD, GBP, CHF)
 * @param currencySymbol Currency symbol (e.g. €, $, £, CHF)
 * @param currencyPosition Display position of the currency symbol (BEFORE or AFTER)
 * @param tempsAlerteWarningMinutes Order warning alert threshold in minutes
 * @param tempsAlerteCommandeMinutes Order urgent alert threshold in minutes
 * @param tempsAlerteCritiqueCommandeMinutes Order critical alert threshold in minutes
 * @param clientBaseUrl Base URL for customer digital ordering QR codes
 * @param wifiSsid Establishment customer Wi-Fi network SSID
 * @param wifiPassword Establishment customer Wi-Fi network password
 * @param wifiSecurity Establishment customer Wi-Fi encryption type (WPA, WEP, nopass)
 * @param wifiEnabled Flag indicating whether customer Wi-Fi QR codes are enabled on table stands
 */
@Schema(description = "Request payload for updating establishment configuration")
public record AppSettingsUpdateRequest(
    @NotBlank(message = "Primary color is required")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Primary color must be a valid hexadecimal code (#RRGGBB)")
    String primaryColor,

    @NotBlank(message = "Strong primary color is required")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Strong primary color must be a valid hexadecimal code (#RRGGBB)")
    String primaryColorStrong,

    @Pattern(regexp = "^https?://.+", message = "Logo must be a valid http(s) URL")
    @Size(max = 2048, message = "Logo URL cannot exceed 2048 characters")
    String logoUrl,

    @NotBlank(message = "Establishment name is required")
    @Size(max = 100, message = "Establishment name cannot exceed 100 characters")
    String establishmentName,

    @NotNull(message = "Default theme is required")
    DefaultTheme defaultTheme,

    @Size(min = 3, max = 3, message = "Currency code must be a 3-letter ISO code")
    String currencyCode,

    @Size(max = 10, message = "Currency symbol cannot exceed 10 characters")
    String currencySymbol,

    CurrencyPosition currencyPosition,

    @jakarta.validation.constraints.Min(value = 1, message = "Warning alert time must be at least 1 minute")
    @jakarta.validation.constraints.Max(value = 120, message = "Warning alert time cannot exceed 120 minutes")
    Integer tempsAlerteWarningMinutes,

    @jakarta.validation.constraints.Min(value = 1, message = "Alert time must be at least 1 minute")
    @jakarta.validation.constraints.Max(value = 120, message = "Alert time cannot exceed 120 minutes")
    Integer tempsAlerteCommandeMinutes,

    @jakarta.validation.constraints.Min(value = 1, message = "Critical alert time must be at least 1 minute")
    @jakarta.validation.constraints.Max(value = 120, message = "Critical alert time cannot exceed 120 minutes")
    Integer tempsAlerteCritiqueCommandeMinutes,

    @Pattern(regexp = "^https?://.+", message = "Client base URL must be a valid http(s) URL")
    @Size(max = 500, message = "Client base URL cannot exceed 500 characters")
    String clientBaseUrl,

    @Size(max = 100, message = "Wi-Fi SSID cannot exceed 100 characters")
    String wifiSsid,

    @Size(max = 100, message = "Wi-Fi password cannot exceed 100 characters")
    String wifiPassword,

    @Size(max = 20, message = "Wi-Fi security cannot exceed 20 characters")
    String wifiSecurity,

    Boolean wifiEnabled
) {
}

