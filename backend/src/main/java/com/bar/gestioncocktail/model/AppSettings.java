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
 * Application settings singleton entity (single row with id=1, single-tenant architecture).
 */
@Data
@Entity
@Table(name = "app_settings")
public class AppSettings {

    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    @NotBlank(message = "Primary color is required")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Primary color must be a valid hex code (#RRGGBB)")
    @Column(nullable = false)
    private String primaryColor = "#6c7fe8";

    @NotBlank(message = "Primary strong color is required")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Primary strong color must be a valid hex code (#RRGGBB)")
    @Column(nullable = false)
    private String primaryColorStrong = "#5a68d6";

    @Pattern(regexp = "^https?://.+", message = "Logo must be a valid http(s) URL")
    @Size(max = 2048, message = "Logo URL cannot exceed 2048 characters")
    private String logoUrl;

    @NotBlank(message = "Establishment name is required")
    @Size(max = 100, message = "Establishment name cannot exceed 100 characters")
    @Column(nullable = false)
    private String establishmentName = "OpenBar";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DefaultTheme defaultTheme = DefaultTheme.DARK;

    @NotBlank(message = "Currency code is required")
    @Size(min = 3, max = 3, message = "Currency code must consist of 3 letters (ISO 4217)")
    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode = "EUR";

    @NotBlank(message = "Currency symbol is required")
    @Size(max = 10, message = "Currency symbol cannot exceed 10 characters")
    @Column(name = "currency_symbol", nullable = false, length = 10)
    private String currencySymbol = "€";

    @Enumerated(EnumType.STRING)
    @Column(name = "currency_position", nullable = false, length = 10)
    private CurrencyPosition currencyPosition = CurrencyPosition.AFTER;

    @jakarta.validation.constraints.NotNull(message = "Order warning alert time is required")
    @jakarta.validation.constraints.Min(value = 1, message = "Warning alert time must be at least 1 minute")
    @jakarta.validation.constraints.Max(value = 120, message = "Warning alert time cannot exceed 120 minutes")
    @Column(nullable = false)
    private Integer tempsAlerteWarningMinutes = 3;

    @jakarta.validation.constraints.NotNull(message = "Order alert time is required")
    @jakarta.validation.constraints.Min(value = 1, message = "Alert time must be at least 1 minute")
    @jakarta.validation.constraints.Max(value = 120, message = "Alert time cannot exceed 120 minutes")
    @Column(nullable = false)
    private Integer tempsAlerteCommandeMinutes = 5;

    @jakarta.validation.constraints.NotNull(message = "Order critical alert time is required")
    @jakarta.validation.constraints.Min(value = 1, message = "Critical alert time must be at least 1 minute")
    @jakarta.validation.constraints.Max(value = 120, message = "Critical alert time cannot exceed 120 minutes")
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
