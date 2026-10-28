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

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_system", length = 20)
    private UnitSystem unitSystem = UnitSystem.METRIC_CL;

    @NotBlank(message = "Volume unit is required")
    @Size(max = 20, message = "Volume unit cannot exceed 20 characters")
    @Column(name = "volume_unit", length = 20)
    private String volumeUnit = "cl";

    @NotBlank(message = "Weight unit is required")
    @Size(max = 20, message = "Weight unit cannot exceed 20 characters")
    @Column(name = "weight_unit", length = 20)
    private String weightUnit = "g";

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
    @Column(name = "default_vat_rate")
    private BigDecimal defaultVatRate = new BigDecimal("20.00");

    @NotNull(message = "Target gross margin percentage is required")
    @DecimalMin(value = "1.0", message = "Target margin must be at least 1%")
    @DecimalMax(value = "100.0", message = "Target margin cannot exceed 100%")
    @Column(name = "target_gross_margin_percentage")
    private BigDecimal targetGrossMarginPercentage = new BigDecimal("70.00");

    @NotNull(message = "Warning gross margin percentage is required")
    @DecimalMin(value = "0.0", message = "Warning margin cannot be negative")
    @DecimalMax(value = "100.0", message = "Warning margin cannot exceed 100%")
    @Column(name = "warning_gross_margin_percentage")
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

    @Column(name = "tpe_enabled")
    private Boolean tpeEnabled = false;

    @Column(name = "tpe_simulator_enabled")
    private Boolean tpeSimulatorEnabled = true;

    @Size(max = 100, message = "Bar TPE IP cannot exceed 100 characters")
    @Column(name = "tpe_bar_ip", length = 100)
    private String tpeBarIp;

    @Size(max = 100, message = "Floor TPE IP cannot exceed 100 characters")
    @Column(name = "tpe_floor_ip", length = 100)
    private String tpeFloorIp;

    @jakarta.validation.constraints.Min(value = 1, message = "TPE port must be at least 1")
    @jakarta.validation.constraints.Max(value = 65535, message = "TPE port cannot exceed 65535")
    @Column(name = "tpe_port")
    private Integer tpePort = 8888;

    @Size(max = 50, message = "TPE terminal ID cannot exceed 50 characters")
    @Column(name = "tpe_terminal_id", length = 50)
    private String tpeTerminalId = "01";

    @jakarta.validation.constraints.Min(value = 5, message = "TPE timeout must be at least 5 seconds")
    @jakarta.validation.constraints.Max(value = 300, message = "TPE timeout cannot exceed 300 seconds")
    @Column(name = "tpe_timeout_seconds")
    private Integer tpeTimeoutSeconds = 45;

    /**
     * Serialized JSON configuration of physical banknotes and coins used for cash drawer counting.
     */
    @Column(name = "cash_denominations_json", columnDefinition = "TEXT")
    private String cashDenominationsJson;

    /**
     * Cash drawer discrepancy tolerance threshold (in establishment currency).
     * If cash discrepancy exceeds this threshold, a visual warning alert is raised on till closure.
     */
    @NotNull(message = "Cash discrepancy tolerance threshold is required")
    @DecimalMin(value = "0.0", message = "Tolerance threshold cannot be negative")
    @Column(name = "cash_discrepancy_tolerance_threshold", precision = 10, scale = 2)
    private BigDecimal cashDiscrepancyToleranceThreshold = new BigDecimal("5.00");

    /**
     * Serialized JSON configuration of inventory storage and service locations (zones de stockage & service).
     */
    @Column(name = "storage_locations_json", columnDefinition = "TEXT")
    private String storageLocationsJson = "[\"Bar Principal\", \"Arrière-bar\", \"Cave à vins & Spiritueux\", \"Chambre froide fûts\"]";

    /**
     * Serialized JSON configuration of ESC/POS network receipt and kitchen printers.
     */
    @Column(name = "printers_json", columnDefinition = "TEXT")
    private String printersJson;

    /**
     * Serialized JSON configuration of Concert / CB IP payment terminals (TPEs).
     */
    @Column(name = "tpe_terminals_json", columnDefinition = "TEXT")
    private String tpeTerminalsJson;

    /**
     * Serialized JSON configuration of emergency assistance helplines for the Angel Shot safety protocol.
     */
    @Column(name = "emergency_numbers_json", columnDefinition = "TEXT")
    private String emergencyNumbersJson = "[{\"name\":\"Police Secours\",\"number\":\"17\",\"description\":\"Urgence immédiate / Agression\"},{\"name\":\"Urgences Europe\",\"number\":\"112\",\"description\":\"Numéro d'urgence européen\"},{\"name\":\"Violences Femmes Info\",\"number\":\"3919\",\"description\":\"Écoute & orientation 24/7\"},{\"name\":\"Urgence SMS (Sourds)\",\"number\":\"114\",\"description\":\"Contact discret par SMS\"}]";

    /**
     * Selected online payment gateway provider (e.g. "STRIPE", "SANDBOX").
     */
    @Column(name = "online_payment_provider", length = 50)
    private String onlinePaymentProvider = "STRIPE";

    /**
     * Stripe publishable key (e.g. pk_test_... or pk_live_...).
     */
    @Column(name = "stripe_publishable_key")
    private String stripePublishableKey;

    /**
     * Stripe secret API key (e.g. sk_test_... or sk_live_...).
     */
    @Column(name = "stripe_secret_key")
    private String stripeSecretKey;

    /**
     * Stripe webhook signing secret (e.g. whsec_...).
     */
    @Column(name = "stripe_webhook_secret")
    private String stripeWebhookSecret;

    /**
     * Currency code used for online payment gateway transactions.
     */
    @Column(name = "online_payment_currency", length = 10)
    private String onlinePaymentCurrency = "EUR";

    /**
     * SMTP Host server for digital receipt email delivery.
     */
    @Column(name = "smtp_host")
    private String smtpHost;

    /**
     * SMTP Port server.
     */
    @Column(name = "smtp_port")
    private Integer smtpPort = 587;

    /**
     * SMTP username.
     */
    @Column(name = "smtp_username")
    private String smtpUsername;

    /**
     * SMTP password.
     */
    @Column(name = "smtp_password")
    private String smtpPassword;

    /**
     * Sender email address for automated receipt emails.
     */
    @Column(name = "smtp_from")
    private String smtpFrom = "no-reply@openbar.local";

    /**
     * Whether SMTP authentication is required.
     */
    @Column(name = "smtp_auth")
    private Boolean smtpAuth = false;

    /**
     * Whether STARTTLS is enabled for SMTP communication.
     */
    @Column(name = "smtp_starttls")
    private Boolean smtpStarttls = false;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public UnitSystem getUnitSystem() {
        return unitSystem != null ? unitSystem : UnitSystem.METRIC_CL;
    }

    public String getVolumeUnit() {
        return (volumeUnit != null && !volumeUnit.isBlank()) ? volumeUnit : "cl";
    }

    public String getWeightUnit() {
        return (weightUnit != null && !weightUnit.isBlank()) ? weightUnit : "g";
    }

    public BigDecimal getDefaultVatRate() {
        return defaultVatRate != null ? defaultVatRate : new BigDecimal("20.00");
    }

    public BigDecimal getTargetGrossMarginPercentage() {
        return targetGrossMarginPercentage != null ? targetGrossMarginPercentage : new BigDecimal("70.00");
    }

    public BigDecimal getWarningGrossMarginPercentage() {
        return warningGrossMarginPercentage != null ? warningGrossMarginPercentage : new BigDecimal("50.00");
    }

    public String getPrintersJson() {
        return printersJson;
    }

    public void setPrintersJson(String printersJson) {
        this.printersJson = printersJson;
    }

    public String getTpeTerminalsJson() {
        return tpeTerminalsJson;
    }

    public void setTpeTerminalsJson(String tpeTerminalsJson) {
        this.tpeTerminalsJson = tpeTerminalsJson;
    }

    public String getOnlinePaymentProvider() {
        return onlinePaymentProvider;
    }

    public void setOnlinePaymentProvider(String onlinePaymentProvider) {
        this.onlinePaymentProvider = onlinePaymentProvider;
    }

    public String getStripePublishableKey() {
        return stripePublishableKey;
    }

    public void setStripePublishableKey(String stripePublishableKey) {
        this.stripePublishableKey = stripePublishableKey;
    }

    public String getStripeSecretKey() {
        return stripeSecretKey;
    }

    public void setStripeSecretKey(String stripeSecretKey) {
        this.stripeSecretKey = stripeSecretKey;
    }

    public String getStripeWebhookSecret() {
        return stripeWebhookSecret;
    }

    public void setStripeWebhookSecret(String stripeWebhookSecret) {
        this.stripeWebhookSecret = stripeWebhookSecret;
    }

    public String getOnlinePaymentCurrency() {
        return onlinePaymentCurrency != null ? onlinePaymentCurrency : "EUR";
    }

    public void setOnlinePaymentCurrency(String onlinePaymentCurrency) {
        this.onlinePaymentCurrency = onlinePaymentCurrency;
    }

    public String getSmtpHost() {
        return smtpHost;
    }

    public void setSmtpHost(String smtpHost) {
        this.smtpHost = smtpHost;
    }

    public Integer getSmtpPort() {
        return smtpPort;
    }

    public void setSmtpPort(Integer smtpPort) {
        this.smtpPort = smtpPort;
    }

    public String getSmtpUsername() {
        return smtpUsername;
    }

    public void setSmtpUsername(String smtpUsername) {
        this.smtpUsername = smtpUsername;
    }

    public String getSmtpPassword() {
        return smtpPassword;
    }

    public void setSmtpPassword(String smtpPassword) {
        this.smtpPassword = smtpPassword;
    }

    public String getSmtpFrom() {
        return smtpFrom;
    }

    public void setSmtpFrom(String smtpFrom) {
        this.smtpFrom = smtpFrom;
    }

    public Boolean getSmtpAuth() {
        return smtpAuth;
    }

    public void setSmtpAuth(Boolean smtpAuth) {
        this.smtpAuth = smtpAuth;
    }

    public Boolean getSmtpStarttls() {
        return smtpStarttls;
    }

    public void setSmtpStarttls(Boolean smtpStarttls) {
        this.smtpStarttls = smtpStarttls;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
