package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.CurrencyPosition;
import com.bar.gestioncocktail.model.DefaultTheme;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Response DTO for transmitting establishment customization, branding, and currency settings.
 *
 * @param id Unique setting identifier
 * @param primaryColor Primary color in hexadecimal format
 * @param primaryColorStrong Strong primary accent color
 * @param logoUrl URL or path to the establishment logo
 * @param establishmentName Commercial name of the establishment
 * @param defaultTheme Default UI theme (DARK, LIGHT, SYSTEM)
 * @param currencyCode ISO 4217 currency code (e.g. EUR, USD, GBP, CHF)
 * @param currencySymbol Currency symbol (e.g. €, $, £, CHF)
 * @param currencyPosition Display position of the currency symbol relative to amounts (BEFORE or AFTER)
 * @param tempsAlerteWarningMinutes Order warning alert threshold in minutes
 * @param tempsAlerteCommandeMinutes Order urgent alert threshold in minutes
 * @param tempsAlerteCritiqueCommandeMinutes Order critical alert threshold in minutes
 * @param clientBaseUrl Base URL for customer digital ordering QR codes (e.g. https://openbar.lan)
 * @param wifiSsid Establishment customer Wi-Fi network SSID
 * @param wifiPassword Establishment customer Wi-Fi network password
 * @param wifiSecurity Establishment customer Wi-Fi encryption type (WPA, WEP, nopass)
 * @param wifiEnabled Flag indicating whether customer Wi-Fi QR codes are enabled on table stands
 * @param updatedAt Last modification timestamp
 */
@Schema(description = "Visual, operational, currency, and QR/Wi-Fi configuration data of the establishment")
public record AppSettingsResponseDTO(
    Long id,
    String primaryColor,
    String primaryColorStrong,
    String logoUrl,
    String establishmentName,
    DefaultTheme defaultTheme,
    String currencyCode,
    String currencySymbol,
    CurrencyPosition currencyPosition,
    Integer tempsAlerteWarningMinutes,
    Integer tempsAlerteCommandeMinutes,
    Integer tempsAlerteCritiqueCommandeMinutes,
    String clientBaseUrl,
    String wifiSsid,
    String wifiPassword,
    String wifiSecurity,
    Boolean wifiEnabled,
    LocalDateTime updatedAt
) {
    /**
     * Converts an {@link AppSettings} entity into a response DTO.
     *
     * @param s Source entity
     * @return Response DTO
     */
    public static AppSettingsResponseDTO from(AppSettings s) {
        return new AppSettingsResponseDTO(
            s.getId(), s.getPrimaryColor(), s.getPrimaryColorStrong(),
            s.getLogoUrl(), s.getEstablishmentName(), s.getDefaultTheme(),
            s.getCurrencyCode(), s.getCurrencySymbol(), s.getCurrencyPosition(),
            s.getTempsAlerteWarningMinutes(),
            s.getTempsAlerteCommandeMinutes(), s.getTempsAlerteCritiqueCommandeMinutes(),
            s.getClientBaseUrl(),
            s.getWifiSsid(),
            s.getWifiPassword(),
            s.getWifiSecurity(),
            s.getWifiEnabled(),
            s.getUpdatedAt()
        );
    }
}


