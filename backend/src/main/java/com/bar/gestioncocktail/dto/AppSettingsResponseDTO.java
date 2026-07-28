package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.DefaultTheme;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * DTO de réponse pour la transmission des paramètres de personnalisation de l'établissement.
 *
 * @param id Identifiant unique du réglage
 * @param primaryColor Couleur primaire au format hexadécimal
 * @param primaryColorStrong Couleur primaire accentuée
 * @param logoUrl URL ou chemin du logo de l'établissement
 * @param establishmentName Nom commercial du bar ou de l'établissement
 * @param defaultTheme Thème par défaut (DARK, LIGHT, SYSTEM)
 * @param updatedAt Date de dernière modification
 */
@Schema(description = "Données de configuration visuelle et légale de l'établissement")
public record AppSettingsResponseDTO(
    Long id,
    String primaryColor,
    String primaryColorStrong,
    String logoUrl,
    String establishmentName,
    DefaultTheme defaultTheme,
    LocalDateTime updatedAt
) {
    /**
     * Convertit une entité {@link AppSettings} en DTO de réponse.
     *
     * @param s L'entité source
     * @return Le DTO de réponse
     */
    public static AppSettingsResponseDTO from(AppSettings s) {
        return new AppSettingsResponseDTO(
            s.getId(), s.getPrimaryColor(), s.getPrimaryColorStrong(),
            s.getLogoUrl(), s.getEstablishmentName(), s.getDefaultTheme(),
            s.getUpdatedAt()
        );
    }
}
