package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.config.CloudRelayProperties;
import com.bar.gestioncocktail.dto.AppSettingsResponseDTO;
import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.event.CloudRelaySettingsUpdatedEvent;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.repository.AppSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business service managing the establishment customization and visual branding singleton (AppSettings).
 */
@Service
@Transactional
public class AppSettingsService {

    private final AppSettingsRepository appSettingsRepository;
    private final NotificationService notificationService;
    private final QrCodeService qrCodeService;
    private final TimeService timeService;
    private final ApplicationEventPublisher eventPublisher;
    private final CloudRelayProperties cloudRelayProperties;
    private final EstablishmentConfigService establishmentConfigService;

    /**
     * Backward-compatible constructor for unit tests.
     *
     * @param appSettingsRepository JPA settings repository
     * @param notificationService   Notification service for STOMP broadcasting
     * @param qrCodeService         QR code generation service
     * @param timeService           Application time service for active timezone resolution
     */
    public AppSettingsService(
            AppSettingsRepository appSettingsRepository,
            NotificationService notificationService,
            QrCodeService qrCodeService,
            TimeService timeService) {
        this(appSettingsRepository, notificationService, qrCodeService, timeService, null, null, null);
    }

    /**
     * Constructs the service with settings repository, notification, QR code, time,
     * event publisher, and Cloud Relay configuration dependencies.
     *
     * @param appSettingsRepository      JPA settings repository
     * @param notificationService        Notification service for STOMP broadcasting
     * @param qrCodeService              QR code generation service
     * @param timeService                Application time service for active timezone resolution
     * @param eventPublisher             Spring event publisher for tunnel sync notifications
     * @param cloudRelayProperties       Cloud Relay properties for public URL resolution
     * @param establishmentConfigService Modular capability config service
     */
    @Autowired
    public AppSettingsService(
            AppSettingsRepository appSettingsRepository,
            NotificationService notificationService,
            QrCodeService qrCodeService,
            TimeService timeService,
            ApplicationEventPublisher eventPublisher,
            CloudRelayProperties cloudRelayProperties,
            EstablishmentConfigService establishmentConfigService) {
        this.appSettingsRepository = appSettingsRepository;
        this.notificationService = notificationService;
        this.qrCodeService = qrCodeService;
        this.timeService = timeService;
        this.eventPublisher = eventPublisher;
        this.cloudRelayProperties = cloudRelayProperties;
        this.establishmentConfigService = establishmentConfigService;
    }

    /**
     * Retrieves the current establishment settings singleton.
     * Creates default settings if none exist.
     *
     * @return The singleton {@link AppSettings} instance
     */
    public AppSettings getSettings() {
        return appSettingsRepository.findById(AppSettings.SINGLETON_ID)
            .orElseGet(this::createDefaultSettings);
    }

    /**
     * Updates visual branding configuration, alert thresholds, and establishment details.
     *
     * @param request DTO containing new customization options
     * @return Updated settings entity
     * @throws BusinessException If a business rule is violated (e.g. unsupported theme or inconsistent thresholds)
     */
    public AppSettings updateSettings(AppSettingsUpdateRequest request) {
        AppSettings current = getSettings();
        applyBranding(current, request);
        applyCurrency(current, request);
        applyAlertThresholds(current, request);
        applyWifiAndQr(current, request);
        applyVatAndMargins(current, request);
        applyPrinters(current, request);
        applyTpe(current, request);
        applyEmergencyNumbers(current, request);
        applyOnlinePayment(current, request);
        applySmtp(current, request);
        applyCloudRelayAndBranding(current, request);

        AppSettings saved = appSettingsRepository.save(current);
        String tz = (timeService != null && timeService.getZoneId() != null)
                ? timeService.getZoneId().getId()
                : AppSettingsResponseDTO.DEFAULT_TIMEZONE;
        notificationService.notifierParametresMisAJour(AppSettingsResponseDTO.from(saved, tz));
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new CloudRelaySettingsUpdatedEvent(
                    Boolean.TRUE.equals(saved.getCloudRelayEnabled()),
                    saved.getVenueSlug(),
                    saved.getCustomDomain()));
        }
        return saved;
    }

    private void applyBranding(AppSettings current, AppSettingsUpdateRequest request) {
        current.setPrimaryColor(request.primaryColor());
        current.setPrimaryColorStrong(request.primaryColorStrong());
        current.setLogoUrl(request.logoUrl());
        current.setEstablishmentName(request.establishmentName());
        if (request.defaultTheme() != null) {
            current.setDefaultTheme(request.defaultTheme());
        }
    }

    private void applyCurrency(AppSettings current, AppSettingsUpdateRequest request) {
        if (request.currencyCode() != null && !request.currencyCode().isBlank()) {
            current.setCurrencyCode(request.currencyCode().trim().toUpperCase());
        }
        if (request.currencySymbol() != null && !request.currencySymbol().isBlank()) {
            current.setCurrencySymbol(request.currencySymbol().trim());
        }
        if (request.currencyPosition() != null) {
            current.setCurrencyPosition(request.currencyPosition());
        }
        if (request.unitSystem() != null) {
            current.setUnitSystem(request.unitSystem());
        }
        if (request.volumeUnit() != null && !request.volumeUnit().isBlank()) {
            current.setVolumeUnit(request.volumeUnit().trim());
        }
        if (request.weightUnit() != null && !request.weightUnit().isBlank()) {
            current.setWeightUnit(request.weightUnit().trim());
        }
        if (request.cashDenominationsJson() != null) {
            current.setCashDenominationsJson(request.cashDenominationsJson());
        }
        if (request.cashDiscrepancyToleranceThreshold() != null) {
            current.setCashDiscrepancyToleranceThreshold(request.cashDiscrepancyToleranceThreshold());
        }
        if (request.storageLocationsJson() != null) {
            current.setStorageLocationsJson(request.storageLocationsJson());
        }
    }

    private void applyAlertThresholds(AppSettings current, AppSettingsUpdateRequest request) {
        int warning = request.tempsAlerteWarningMinutes() != null ? request.tempsAlerteWarningMinutes() : current.getTempsAlerteWarningMinutes();
        int urgent = request.tempsAlerteCommandeMinutes() != null ? request.tempsAlerteCommandeMinutes() : current.getTempsAlerteCommandeMinutes();
        int critical = request.tempsAlerteCritiqueCommandeMinutes() != null ? request.tempsAlerteCritiqueCommandeMinutes() : current.getTempsAlerteCritiqueCommandeMinutes();

        if (warning >= urgent || urgent >= critical) {
            throw new BusinessException(
                "Warning alert threshold (" + warning + " min) must be strictly less than urgent alert threshold (" +
                urgent + " min), which must be strictly less than critical alert threshold (" + critical + " min)");
        }

        current.setTempsAlerteWarningMinutes(warning);
        current.setTempsAlerteCommandeMinutes(urgent);
        current.setTempsAlerteCritiqueCommandeMinutes(critical);
    }

    private void applyWifiAndQr(AppSettings current, AppSettingsUpdateRequest request) {
        if (request.clientBaseUrl() != null && !request.clientBaseUrl().isBlank()) {
            current.setClientBaseUrl(request.clientBaseUrl().trim());
        }
        if (request.wifiSsid() != null) {
            current.setWifiSsid(request.wifiSsid().trim());
        }
        if (request.wifiPassword() != null) {
            current.setWifiPassword(request.wifiPassword());
        }
        if (request.wifiSecurity() != null && !request.wifiSecurity().isBlank()) {
            current.setWifiSecurity(request.wifiSecurity().trim());
        }
        if (request.wifiEnabled() != null) {
            current.setWifiEnabled(request.wifiEnabled());
        }
        if (request.tableSessionValidationEnabled() != null) {
            current.setTableSessionValidationEnabled(request.tableSessionValidationEnabled());
        }
    }

    private void applyVatAndMargins(AppSettings current, AppSettingsUpdateRequest request) {
        if (request.defaultVatRate() != null) {
            current.setDefaultVatRate(request.defaultVatRate());
        }
        java.math.BigDecimal target = request.targetGrossMarginPercentage() != null
                ? request.targetGrossMarginPercentage()
                : current.getTargetGrossMarginPercentage();
        java.math.BigDecimal warning = request.warningGrossMarginPercentage() != null
                ? request.warningGrossMarginPercentage()
                : current.getWarningGrossMarginPercentage();

        if (target != null && warning != null && warning.compareTo(target) >= 0) {
            throw new BusinessException(
                "Warning margin threshold (" + warning + "%) must be strictly less than target margin threshold (" + target + "%)");
        }

        if (request.targetGrossMarginPercentage() != null) {
            current.setTargetGrossMarginPercentage(request.targetGrossMarginPercentage());
        }
        if (request.warningGrossMarginPercentage() != null) {
            current.setWarningGrossMarginPercentage(request.warningGrossMarginPercentage());
        }
    }

    private void applyPrinters(AppSettings current, AppSettingsUpdateRequest request) {
        if (request.barPrinterIp() != null) {
            current.setBarPrinterIp(request.barPrinterIp().trim());
        }
        if (request.kitchenPrinterIp() != null) {
            current.setKitchenPrinterIp(request.kitchenPrinterIp().trim());
        }
        if (request.cashDeskPrinterIp() != null) {
            current.setCashDeskPrinterIp(request.cashDeskPrinterIp().trim());
        }
        if (request.printerPort() != null) {
            current.setPrinterPort(request.printerPort());
        }
        if (request.directPrintingEnabled() != null) {
            current.setDirectPrintingEnabled(request.directPrintingEnabled());
        }
        if (request.printersJson() != null) {
            current.setPrintersJson(request.printersJson());
        }
    }

    private void applyTpe(AppSettings current, AppSettingsUpdateRequest request) {
        if (request.tpeEnabled() != null) {
            current.setTpeEnabled(request.tpeEnabled());
        }
        if (request.tpeSimulatorEnabled() != null) {
            current.setTpeSimulatorEnabled(request.tpeSimulatorEnabled());
        }
        if (request.tpeBarIp() != null) {
            current.setTpeBarIp(request.tpeBarIp().trim());
        }
        if (request.tpeFloorIp() != null) {
            current.setTpeFloorIp(request.tpeFloorIp().trim());
        }
        if (request.tpePort() != null) {
            current.setTpePort(request.tpePort());
        }
        if (request.tpeTerminalId() != null) {
            current.setTpeTerminalId(request.tpeTerminalId().trim());
        }
        if (request.tpeTimeoutSeconds() != null) {
            current.setTpeTimeoutSeconds(request.tpeTimeoutSeconds());
        }
        if (request.tpeTerminalsJson() != null) {
            current.setTpeTerminalsJson(request.tpeTerminalsJson());
        }
        if (request.tpeMonetizationMode() != null && !request.tpeMonetizationMode().isBlank()) {
            current.setTpeMonetizationMode(request.tpeMonetizationMode().trim().toUpperCase());
        }
        if (request.stripeConnectedAccountId() != null) {
            current.setStripeConnectedAccountId(request.stripeConnectedAccountId().trim());
        }
        if (request.stripeTerminalLocationId() != null) {
            current.setStripeTerminalLocationId(request.stripeTerminalLocationId().trim());
        }
        if (request.stripeTerminalReaderId() != null) {
            current.setStripeTerminalReaderId(request.stripeTerminalReaderId().trim());
        }
    }

    private void applyEmergencyNumbers(AppSettings current, AppSettingsUpdateRequest request) {
        if (request.emergencyNumbersJson() != null) {
            current.setEmergencyNumbersJson(request.emergencyNumbersJson());
        }
    }

    private void applyOnlinePayment(AppSettings current, AppSettingsUpdateRequest request) {
        if (request.onlinePaymentProvider() != null && !request.onlinePaymentProvider().isBlank()) {
            current.setOnlinePaymentProvider(request.onlinePaymentProvider().trim().toUpperCase());
        }
        if (request.stripePublishableKey() != null) {
            current.setStripePublishableKey(request.stripePublishableKey().trim());
        }
        if (request.stripeSecretKey() != null && !request.stripeSecretKey().isBlank()) {
            current.setStripeSecretKey(request.stripeSecretKey().trim());
        }
        if (request.stripeWebhookSecret() != null && !request.stripeWebhookSecret().isBlank()) {
            current.setStripeWebhookSecret(request.stripeWebhookSecret().trim());
        }
        if (request.onlinePaymentCurrency() != null && !request.onlinePaymentCurrency().isBlank()) {
            current.setOnlinePaymentCurrency(request.onlinePaymentCurrency().trim().toUpperCase());
        }
    }

    private void applySmtp(AppSettings current, AppSettingsUpdateRequest request) {
        if (request.smtpHost() != null) {
            current.setSmtpHost(request.smtpHost().trim());
        }
        if (request.smtpPort() != null) {
            current.setSmtpPort(request.smtpPort());
        }
        if (request.smtpUsername() != null) {
            current.setSmtpUsername(request.smtpUsername().trim());
        }
        if (request.smtpPassword() != null && !request.smtpPassword().isBlank()) {
            current.setSmtpPassword(request.smtpPassword().trim());
        }
        if (request.smtpFrom() != null && !request.smtpFrom().isBlank()) {
            current.setSmtpFrom(request.smtpFrom().trim());
        }
        if (request.smtpAuth() != null) {
            current.setSmtpAuth(request.smtpAuth());
        }
        if (request.smtpStarttls() != null) {
            current.setSmtpStarttls(request.smtpStarttls());
        }
    }

    private void applyCloudRelayAndBranding(AppSettings current, AppSettingsUpdateRequest request) {
        applyCloudRelayDomainAndBranding(current, request);
        applyCloudRelayAccessPolicies(current, request);
    }

    private void applyCloudRelayDomainAndBranding(AppSettings current, AppSettingsUpdateRequest request) {
        if (request.cloudRelayEnabled() != null) {
            current.setCloudRelayEnabled(request.cloudRelayEnabled());
        }
        if (request.venueSlug() != null) {
            current.setVenueSlug(trimLowerOrNull(request.venueSlug()));
        }
        if (request.customDomain() != null) {
            current.setCustomDomain(trimLowerOrNull(request.customDomain()));
        }
        if (request.bannerImageUrl() != null) {
            String normalizedBanner = request.bannerImageUrl().trim();
            current.setBannerImageUrl(normalizedBanner.isBlank() ? null : normalizedBanner);
        }
        if (hasText(request.relayPairingToken())) {
            current.setRelayPairingToken(request.relayPairingToken().trim());
        }
    }

    private void applyCloudRelayAccessPolicies(AppSettings current, AppSettingsUpdateRequest request) {
        if (request.cloudRelayClientsEnabled() != null) {
            current.setCloudRelayClientsEnabled(request.cloudRelayClientsEnabled());
        }
        if (request.cloudRelayStaffEnabled() != null) {
            current.setCloudRelayStaffEnabled(request.cloudRelayStaffEnabled());
        }
        if (request.cloudRelayAdminEnabled() != null) {
            current.setCloudRelayAdminEnabled(request.cloudRelayAdminEnabled());
        }
        if (request.cloudRelayRemoteTpeEnabled() != null) {
            current.setCloudRelayRemoteTpeEnabled(request.cloudRelayRemoteTpeEnabled());
        }
        if (request.cloudRelayRemotePrintingEnabled() != null) {
            current.setCloudRelayRemotePrintingEnabled(request.cloudRelayRemotePrintingEnabled());
        }
        if (request.cloudRelayAllowedRolesJson() != null) {
            current.setCloudRelayAllowedRolesJson(request.cloudRelayAllowedRolesJson());
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String trimLowerOrNull(String value) {
        String normalized = value.trim().toLowerCase();
        return normalized.isBlank() ? null : normalized;
    }

    /**
     * Resolves the effective public base URL using wired Cloud Relay properties and module configuration.
     *
     * @param settings Current establishment settings
     * @return Resolved base URL without trailing slash
     */
    public String resolveEffectivePublicBaseUrl(AppSettings settings) {
        String baseDomain = cloudRelayProperties != null ? cloudRelayProperties.getBaseDomain() : "open-bar.eu";
        boolean moduleEnabled = establishmentConfigService == null
                || establishmentConfigService.isModuleEnabled(EstablishmentModule.CLOUD_RELAY);
        return resolveEffectivePublicBaseUrl(settings, baseDomain, moduleEnabled);
    }

    /**
     * Resolves the effective public base URL used for table QR codes and patron entrypoints.
     * Prefers custom CNAME domain, then Cloud Relay subdomain when Cloud Relay is enabled,
     * and falls back to the configured local {@code clientBaseUrl}.
     *
     * @param settings Current establishment settings
     * @param baseDomain Cloud Relay base domain (e.g. {@code open-bar.eu})
     * @param cloudRelayModuleEnabled Whether the {@code CLOUD_RELAY} capability module is active
     * @return Resolved base URL without trailing slash
     */
    public String resolveEffectivePublicBaseUrl(AppSettings settings, String baseDomain, boolean cloudRelayModuleEnabled) {
        if (settings == null) {
            return "https://openbar.lan";
        }
        String relayHostUrl = resolveCloudRelayHostUrl(settings, baseDomain, cloudRelayModuleEnabled);
        if (relayHostUrl != null) {
            return relayHostUrl;
        }
        if (hasText(settings.getClientBaseUrl())) {
            String url = settings.getClientBaseUrl().trim();
            return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
        }
        return "https://openbar.lan";
    }

    private static String resolveCloudRelayHostUrl(AppSettings settings, String baseDomain, boolean moduleEnabled) {
        if (!moduleEnabled || !Boolean.TRUE.equals(settings.getCloudRelayEnabled())) {
            return null;
        }
        if (hasText(settings.getCustomDomain())) {
            return "https://" + settings.getCustomDomain().trim().toLowerCase();
        }
        if (hasText(settings.getVenueSlug())) {
            String domain = hasText(baseDomain) ? baseDomain.trim().toLowerCase() : "open-bar.eu";
            return "https://" + settings.getVenueSlug().trim().toLowerCase() + "." + domain;
        }
        return null;
    }

    /**
     * Generates a Wi-Fi configuration pairing QR code (PNG or SVG).
     *
     * @param format Output format (PNG or SVG)
     * @param size Dimension in pixels
     * @return Generated image binary content
     */
    @Transactional(readOnly = true)
    public byte[] generateWifiQrCode(String format, int size) {
        AppSettings settings = getSettings();
        if (settings.getWifiSsid() == null || settings.getWifiSsid().isBlank()) {
            throw new BusinessException("Wi-Fi SSID is not configured");
        }
        String payload = qrCodeService.formatWifiPayload(settings.getWifiSsid(), settings.getWifiPassword(), settings.getWifiSecurity());
        int dimension = Math.clamp(size > 0 ? size : 300, 100, 2000);
        if ("SVG".equalsIgnoreCase(format)) {
            String svg = qrCodeService.generateSvg(payload, dimension);
            return svg.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }
        return qrCodeService.generatePng(payload, dimension, dimension);
    }

    /**
     * Creates and persists a default settings instance.
     * <p>
     * Two concurrent requests may encounter an empty table simultaneously (e.g. two devices booting
     * at the same time) — the second insert triggers a primary key constraint violation on the fixed ID
     * and falls back to loading the persisted singleton.
     *
     * @return Created or loaded default settings
     */
    private AppSettings createDefaultSettings() {
        try {
            return appSettingsRepository.save(new AppSettings());
        } catch (DataIntegrityViolationException e) {
            return appSettingsRepository.findById(AppSettings.SINGLETON_ID).orElseThrow(() -> e);
        }
    }
}
