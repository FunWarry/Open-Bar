package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.DefaultTheme;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Response DTO for transmitting establishment customization and branding settings.
 *
 * @param id Unique setting identifier
 * @param primaryColor Primary color in hexadecimal format
 * @param primaryColorStrong Strong primary accent color
 * @param logoUrl URL or path to the establishment logo
 * @param establishmentName Commercial name of the establishment
 * @param defaultTheme Default UI theme (DARK, LIGHT, SYSTEM)
 * @param tempsAlerteWarningMinutes Order warning alert threshold in minutes
 * @param tempsAlerteCommandeMinutes Order urgent alert threshold in minutes
 * @param tempsAlerteCritiqueCommandeMinutes Order critical alert threshold in minutes
 * @param updatedAt Last modification timestamp
 */
@Schema(description = "Visual and operational configuration data of the establishment")
public record AppSettingsResponseDTO(
    Long id,
    String primaryColor,
    String primaryColorStrong,
    String logoUrl,
    String establishmentName,
    DefaultTheme defaultTheme,
    Integer tempsAlerteWarningMinutes,
    Integer tempsAlerteCommandeMinutes,
    Integer tempsAlerteCritiqueCommandeMinutes,
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
            s.getTempsAlerteWarningMinutes(),
            s.getTempsAlerteCommandeMinutes(), s.getTempsAlerteCritiqueCommandeMinutes(),
            s.getUpdatedAt()
        );
    }
}
