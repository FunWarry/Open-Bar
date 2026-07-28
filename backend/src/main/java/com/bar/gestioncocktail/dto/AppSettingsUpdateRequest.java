package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.DefaultTheme;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * DTO de requête pour la mise à jour des paramètres de l'établissement.
 *
 * @param primaryColor Couleur primaire (#RRGGBB)
 * @param primaryColorStrong Couleur primaire accentuée (#RRGGBB)
 * @param logoUrl URL du logo d'établissement
 * @param establishmentName Nom commercial de l'établissement
 * @param defaultTheme Thème par défaut appliqué à l'interface
 */
@Schema(description = "Requête de mise à jour de la configuration de l'établissement")
public record AppSettingsUpdateRequest(
    @NotBlank(message = "La couleur primaire est obligatoire")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur primaire doit être un code hexadécimal (#RRGGBB)")
    String primaryColor,

    @NotBlank(message = "La couleur primaire forte est obligatoire")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur primaire forte doit être un code hexadécimal (#RRGGBB)")
    String primaryColorStrong,

    @Pattern(regexp = "^https?://.+", message = "Le logo doit être une URL http(s) valide")
    @Size(max = 2048, message = "L'URL du logo ne peut pas dépasser 2048 caractères")
    String logoUrl,

    @NotBlank(message = "Le nom de l'établissement est obligatoire")
    @Size(max = 100, message = "Le nom de l'établissement ne peut pas dépasser 100 caractères")
    String establishmentName,

    @NotNull(message = "Le thème par défaut est obligatoire")
    DefaultTheme defaultTheme
) {
}
