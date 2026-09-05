package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.AppSettingsResponseDTO;
import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.repository.AppSettingsRepository;
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

    /**
     * Constructs the service with settings repository, notification service, and QR code service dependencies.
     *
     * @param appSettingsRepository JPA settings repository
     * @param notificationService Notification service for STOMP broadcasting
     * @param qrCodeService QR code generation service
     */
    public AppSettingsService(
            AppSettingsRepository appSettingsRepository,
            NotificationService notificationService,
            QrCodeService qrCodeService) {
        this.appSettingsRepository = appSettingsRepository;
        this.notificationService = notificationService;
        this.qrCodeService = qrCodeService;
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

        AppSettings saved = appSettingsRepository.save(current);
        notificationService.notifierParametresMisAJour(AppSettingsResponseDTO.from(saved));
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
