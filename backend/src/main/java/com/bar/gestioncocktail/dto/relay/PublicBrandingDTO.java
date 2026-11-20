package com.bar.gestioncocktail.dto.relay;

import com.bar.gestioncocktail.model.DefaultTheme;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Public-safe white-label branding and fallback payload served to patrons, login screens,
 * and offline fallback views without exposing sensitive infrastructure credentials.
 *
 * @param establishmentName Commercial venue name
 * @param venueSlug         Configured venue subdomain slug
 * @param customDomain      Configured custom CNAME domain
 * @param primaryColor      Primary accent hex color
 * @param primaryColorStrong Strong accent hex color
 * @param logoUrl           Venue logo image URL
 * @param bannerImageUrl    Venue hero banner image URL
 * @param defaultTheme      Default theme (DARK or LIGHT)
 * @param cloudRelayEnabled Whether Cloud Relay public access is enabled
 * @param tunnelConnected   Whether the outbound Cloud Relay tunnel is currently healthy
 * @param clientsEnabled    Whether patron QR access via tunnel is permitted
 * @param staffEnabled      Whether staff login via tunnel is permitted
 * @param effectivePublicUrl Resolved public URL for QR codes and patron links
 * @param localFallbackUrl  Local Wi-Fi fallback URL (e.g. {@code https://openbar.lan})
 * @param wifiEnabled       Whether customer Wi-Fi credentials are configured for fallback
 * @param wifiSsid          Customer Wi-Fi SSID displayed on offline fallback screen
 */
@Schema(description = "Public white-label branding and tunnel fallback metadata for patrons and login pages")
public record PublicBrandingDTO(
        String establishmentName,
        String venueSlug,
        String customDomain,
        String primaryColor,
        String primaryColorStrong,
        String logoUrl,
        String bannerImageUrl,
        DefaultTheme defaultTheme,
        boolean cloudRelayEnabled,
        boolean tunnelConnected,
        boolean clientsEnabled,
        boolean staffEnabled,
        String effectivePublicUrl,
        String localFallbackUrl,
        boolean wifiEnabled,
        String wifiSsid
) {
}
