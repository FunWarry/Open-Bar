package com.bar.gestioncocktail.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Singleton — une seule ligne (id=1), pas d'architecture multi-tenant (cf. CDC §11).
 */
@Data
@Entity
@Table(name = "app_settings")
public class AppSettings {

    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    @NotBlank(message = "La couleur primaire est obligatoire")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur primaire doit être un code hexadécimal (#RRGGBB)")
    @Column(nullable = false)
    private String primaryColor = "#6c7fe8";

    @NotBlank(message = "La couleur primaire forte est obligatoire")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur primaire forte doit être un code hexadécimal (#RRGGBB)")
    @Column(nullable = false)
    private String primaryColorStrong = "#5a68d6";

    @Pattern(regexp = "^https?://.+", message = "Le logo doit être une URL http(s) valide")
    @Size(max = 2048, message = "L'URL du logo ne peut pas dépasser 2048 caractères")
    private String logoUrl;

    @NotBlank(message = "Le nom de l'établissement est obligatoire")
    @Size(max = 100, message = "Le nom de l'établissement ne peut pas dépasser 100 caractères")
    @Column(nullable = false)
    private String establishmentName = "OpenBar";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DefaultTheme defaultTheme = DefaultTheme.DARK;

    @jakarta.validation.constraints.NotNull(message = "Le temps d'alerte des commandes est obligatoire")
    @jakarta.validation.constraints.Min(value = 1, message = "Le temps d'alerte doit être d'au moins 1 minute")
    @jakarta.validation.constraints.Max(value = 120, message = "Le temps d'alerte ne peut pas dépasser 120 minutes")
    @Column(nullable = false)
    private Integer tempsAlerteCommandeMinutes = 5;

    @jakarta.validation.constraints.NotNull(message = "Le temps d'alerte critique des commandes est obligatoire")
    @jakarta.validation.constraints.Min(value = 1, message = "Le temps d'alerte critique doit être d'au moins 1 minute")
    @jakarta.validation.constraints.Max(value = 120, message = "Le temps d'alerte critique ne peut pas dépasser 120 minutes")
    @Column(nullable = false)
    private Integer tempsAlerteCritiqueCommandeMinutes = 10;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
