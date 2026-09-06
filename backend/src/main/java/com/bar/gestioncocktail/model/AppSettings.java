package com.bar.gestioncocktail.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
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

    @Pattern(regexp = "^https?://.+", message = "Client base URL must be a valid http(s) URL")
    @Size(max = 500, message = "Client base URL cannot exceed 500 characters")
    @Column(name = "client_base_url", length = 500)
    private String clientBaseUrl = "https://openbar.lan";

    @Size(max = 100, message = "Wi-Fi SSID cannot exceed 100 characters")
    @Column(name = "wifi_ssid", length = 100)
    private String wifiSsid;

    @Size(max = 100, message = "Wi-Fi password cannot exceed 100 characters")
    @Column(name = "wifi_password", length = 100)
    private String wifiPassword;

    @Size(max = 20, message = "Wi-Fi security cannot exceed 20 characters")
    @Column(name = "wifi_security", length = 20)
    private String wifiSecurity = "WPA";

    @Column(name = "wifi_enabled")
    private Boolean wifiEnabled = false;

    @Column(name = "table_session_validation_enabled")
    private Boolean tableSessionValidationEnabled = false;

    @NotNull(message = "Default VAT rate is required")
    @DecimalMin(value = "0.0", message = "VAT rate cannot be negative")
    @DecimalMax(value = "100.0", message = "VAT rate cannot exceed 100%")
    @Column(name = "default_vat_rate", nullable = false)
    private BigDecimal defaultVatRate = new BigDecimal("20.00");

    @NotNull(message = "Target gross margin percentage is required")
    @DecimalMin(value = "1.0", message = "Target margin must be at least 1%")
    @DecimalMax(value = "100.0", message = "Target margin cannot exceed 100%")
    @Column(name = "target_gross_margin_percentage", nullable = false)
    private BigDecimal targetGrossMarginPercentage = new BigDecimal("70.00");

    @NotNull(message = "Warning gross margin percentage is required")
    @DecimalMin(value = "0.0", message = "Warning margin cannot be negative")
    @DecimalMax(value = "100.0", message = "Warning margin cannot exceed 100%")
    @Column(name = "warning_gross_margin_percentage", nullable = false)
    private BigDecimal warningGrossMarginPercentage = new BigDecimal("50.00");

    @Size(max = 100, message = "Bar printer IP cannot exceed 100 characters")
    @Column(name = "bar_printer_ip", length = 100)
    private String barPrinterIp;

    @Size(max = 100, message = "Kitchen printer IP cannot exceed 100 characters")
    @Column(name = "kitchen_printer_ip", length = 100)
    private String kitchenPrinterIp;

    @Size(max = 100, message = "Cash desk printer IP cannot exceed 100 characters")
    @Column(name = "cash_desk_printer_ip", length = 100)
    private String cashDeskPrinterIp;

    @jakarta.validation.constraints.Min(value = 1, message = "Printer port must be at least 1")
    @jakarta.validation.constraints.Max(value = 65535, message = "Printer port cannot exceed 65535")
    @Column(name = "printer_port")
    private Integer printerPort = 9100;

    @Column(name = "direct_printing_enabled")
    private Boolean directPrintingEnabled = false;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
