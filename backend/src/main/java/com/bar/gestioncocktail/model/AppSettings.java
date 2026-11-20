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
     * Active physical TPE hardware mode ("CONCERT_IP" for Option 1 or "STRIPE_TERMINAL" for Option 3).
     */
    @Column(name = "tpe_monetization_mode", length = 30)
    private String tpeMonetizationMode = "CONCERT_IP";

    /**
     * Stripe Connect destination account identifier (acct_...) for Option 3 Smart TPE PayFac splits.
     */
    @Size(max = 120, message = "Stripe Connected Account ID cannot exceed 120 characters")
    @Column(name = "stripe_connected_account_id", length = 120)
    private String stripeConnectedAccountId;

    /**
     * Stripe Terminal Location identifier (tml_...) for Option 3 WisePOS E reader pairing.
     */
    @Size(max = 120, message = "Stripe Terminal Location ID cannot exceed 120 characters")
    @Column(name = "stripe_terminal_location_id", length = 120)
    private String stripeTerminalLocationId;

    /**
     * Stripe Terminal Reader identifier (tmr_...) for Option 3 WisePOS E hardware.
     */
    @Size(max = 120, message = "Stripe Terminal Reader ID cannot exceed 120 characters")
    @Column(name = "stripe_terminal_reader_id", length = 120)
    private String stripeTerminalReaderId;

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

    /** Whether outbound reverse Cloud Relay tunnel connectivity is active for this venue. */
    @Column(name = "cloud_relay_enabled")
    private Boolean cloudRelayEnabled = false;

    /** Dedicated venue subdomain slug under the Cloud Relay base domain (e.g. {@code le-shaker}). */
    @Pattern(regexp = "^$|^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$", message = "Venue slug must be lowercase alphanumeric with hyphens (1-63 chars)")
    @Size(max = 63, message = "Venue slug cannot exceed 63 characters")
    @Column(name = "venue_slug", length = 63)
    private String venueSlug;

    /** Optional white-label custom domain CNAME (e.g. {@code commande.monbar.fr}). */
    @Pattern(regexp = "^$|^[a-zA-Z0-9][a-zA-Z0-9.-]{0,251}[a-zA-Z0-9]\\.[a-zA-Z]{2,63}$", message = "Custom domain must be a valid hostname")
    @Size(max = 255, message = "Custom domain cannot exceed 255 characters")
    @Column(name = "custom_domain", length = 255)
    private String customDomain;

    /** Optional white-label hero banner image URL displayed on patron & login screens. */
    @Pattern(regexp = "^$|^https?://.+|^/uploads/.+", message = "Banner image URL must be a valid http(s) or /uploads/ URL")
    @Size(max = 2048, message = "Banner image URL cannot exceed 2048 characters")
    @Column(name = "banner_image_url", length = 2048)
    private String bannerImageUrl;

    /** Secret pairing token authenticating this local instance to the Cloud Relay gateway. */
    @Size(max = 512, message = "Relay pairing token cannot exceed 512 characters")
    @Column(name = "relay_pairing_token", length = 512)
    private String relayPairingToken;

    /** Whether patrons (QR ordering, pay-at-table, public routes) can access the bar via Cloud Relay. */
    @Column(name = "cloud_relay_clients_enabled")
    private Boolean cloudRelayClientsEnabled = true;

    /** Whether authenticated staff (SERVEUR, BARMAN, MANAGER) can access OpenBar via Cloud Relay. */
    @Column(name = "cloud_relay_staff_enabled")
    private Boolean cloudRelayStaffEnabled = true;

    /** Whether administrative endpoints and settings are accessible via Cloud Relay. */
    @Column(name = "cloud_relay_admin_enabled")
    private Boolean cloudRelayAdminEnabled = true;

    /** Whether card payment terminal (TPE) dispatch is permitted from Cloud Relay requests. */
    @Column(name = "cloud_relay_remote_tpe_enabled")
    private Boolean cloudRelayRemoteTpeEnabled = true;

    /** Whether direct ESC/POS LAN printing is permitted from Cloud Relay requests. */
    @Column(name = "cloud_relay_remote_printing_enabled")
    private Boolean cloudRelayRemotePrintingEnabled = true;

    /** JSON array of UserRole names permitted to access OpenBar through the Cloud Relay tunnel. */
    @Column(name = "cloud_relay_allowed_roles_json", columnDefinition = "TEXT")
    private String cloudRelayAllowedRolesJson = "[\"SERVEUR\",\"BARMAN\",\"MANAGER\",\"ADMIN\"]";

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

    public String getTpeMonetizationMode() {
        return (tpeMonetizationMode != null && !tpeMonetizationMode.isBlank()) ? tpeMonetizationMode : "CONCERT_IP";
    }

    public void setTpeMonetizationMode(String tpeMonetizationMode) {
        this.tpeMonetizationMode = tpeMonetizationMode;
    }

    public String getStripeConnectedAccountId() {
        return stripeConnectedAccountId;
    }

    public void setStripeConnectedAccountId(String stripeConnectedAccountId) {
        this.stripeConnectedAccountId = stripeConnectedAccountId;
    }

    public String getStripeTerminalLocationId() {
        return stripeTerminalLocationId;
    }

    public void setStripeTerminalLocationId(String stripeTerminalLocationId) {
        this.stripeTerminalLocationId = stripeTerminalLocationId;
    }

    public String getStripeTerminalReaderId() {
        return stripeTerminalReaderId;
    }

    public void setStripeTerminalReaderId(String stripeTerminalReaderId) {
        this.stripeTerminalReaderId = stripeTerminalReaderId;
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

    public Boolean getCloudRelayEnabled() {
        return Boolean.TRUE.equals(cloudRelayEnabled);
    }

    public void setCloudRelayEnabled(Boolean cloudRelayEnabled) {
        this.cloudRelayEnabled = cloudRelayEnabled;
    }

    public String getVenueSlug() {
        return venueSlug;
    }

    public void setVenueSlug(String venueSlug) {
        this.venueSlug = venueSlug;
    }

    public String getCustomDomain() {
        return customDomain;
    }

    public void setCustomDomain(String customDomain) {
        this.customDomain = customDomain;
    }

    public String getBannerImageUrl() {
        return bannerImageUrl;
    }

    public void setBannerImageUrl(String bannerImageUrl) {
        this.bannerImageUrl = bannerImageUrl;
    }

    public String getRelayPairingToken() {
        return relayPairingToken;
    }

    public void setRelayPairingToken(String relayPairingToken) {
        this.relayPairingToken = relayPairingToken;
    }

    public Boolean getCloudRelayClientsEnabled() {
        return cloudRelayClientsEnabled == null || cloudRelayClientsEnabled;
    }

    public void setCloudRelayClientsEnabled(Boolean cloudRelayClientsEnabled) {
        this.cloudRelayClientsEnabled = cloudRelayClientsEnabled;
    }

    public Boolean getCloudRelayStaffEnabled() {
        return cloudRelayStaffEnabled == null || cloudRelayStaffEnabled;
    }

    public void setCloudRelayStaffEnabled(Boolean cloudRelayStaffEnabled) {
        this.cloudRelayStaffEnabled = cloudRelayStaffEnabled;
    }

    public Boolean getCloudRelayAdminEnabled() {
        return cloudRelayAdminEnabled == null || cloudRelayAdminEnabled;
    }

    public void setCloudRelayAdminEnabled(Boolean cloudRelayAdminEnabled) {
        this.cloudRelayAdminEnabled = cloudRelayAdminEnabled;
    }

    public Boolean getCloudRelayRemoteTpeEnabled() {
        return cloudRelayRemoteTpeEnabled == null || cloudRelayRemoteTpeEnabled;
    }

    public void setCloudRelayRemoteTpeEnabled(Boolean cloudRelayRemoteTpeEnabled) {
        this.cloudRelayRemoteTpeEnabled = cloudRelayRemoteTpeEnabled;
    }

    public Boolean getCloudRelayRemotePrintingEnabled() {
        return cloudRelayRemotePrintingEnabled == null || cloudRelayRemotePrintingEnabled;
    }

    public void setCloudRelayRemotePrintingEnabled(Boolean cloudRelayRemotePrintingEnabled) {
        this.cloudRelayRemotePrintingEnabled = cloudRelayRemotePrintingEnabled;
    }

    public String getCloudRelayAllowedRolesJson() {
        return (cloudRelayAllowedRolesJson != null && !cloudRelayAllowedRolesJson.isBlank())
                ? cloudRelayAllowedRolesJson
                : "[\"SERVEUR\",\"BARMAN\",\"MANAGER\",\"ADMIN\"]";
    }

    public void setCloudRelayAllowedRolesJson(String cloudRelayAllowedRolesJson) {
        this.cloudRelayAllowedRolesJson = cloudRelayAllowedRolesJson;
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
