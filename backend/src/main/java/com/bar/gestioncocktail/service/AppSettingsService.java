package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.DefaultTheme;
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

    /**
     * Constructs the service with settings repository dependency.
     *
     * @param appSettingsRepository JPA settings repository
     */
    public AppSettingsService(AppSettingsRepository appSettingsRepository) {
        this.appSettingsRepository = appSettingsRepository;
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
     * Updates visual branding configuration and establishment details.
     *
     * @param request DTO containing new customization options
     * @return Updated settings entity
     * @throws BusinessException If a business rule is violated (e.g. unsupported theme)
     */
    public AppSettings updateSettings(AppSettingsUpdateRequest request) {
        if (request.defaultTheme() == DefaultTheme.LIGHT) {
            throw new BusinessException(
                "Light theme is not yet available (Figma design in progress, cf. ticket #154)");
        }
        AppSettings current = getSettings();
        current.setPrimaryColor(request.primaryColor());
        current.setPrimaryColorStrong(request.primaryColorStrong());
        current.setLogoUrl(request.logoUrl());
        current.setEstablishmentName(request.establishmentName());
        current.setDefaultTheme(request.defaultTheme());
        if (request.tempsAlerteCommandeMinutes() != null) {
            current.setTempsAlerteCommandeMinutes(request.tempsAlerteCommandeMinutes());
        }
        if (request.tempsAlerteCritiqueCommandeMinutes() != null) {
            current.setTempsAlerteCritiqueCommandeMinutes(request.tempsAlerteCritiqueCommandeMinutes());
        }
        return appSettingsRepository.save(current);
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
