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
    Integer tempsAlerteCritiqueCommandeMinutes
) {
}

