package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.DefaultTheme;
import java.time.LocalDateTime;

public record AppSettingsResponseDTO(
    Long id,
    String primaryColor,
    String primaryColorStrong,
    String logoUrl,
    String establishmentName,
    DefaultTheme defaultTheme,
    LocalDateTime updatedAt
) {
    public static AppSettingsResponseDTO from(AppSettings s) {
        return new AppSettingsResponseDTO(
            s.getId(), s.getPrimaryColor(), s.getPrimaryColorStrong(),
            s.getLogoUrl(), s.getEstablishmentName(), s.getDefaultTheme(),
            s.getUpdatedAt()
        );
    }
}
