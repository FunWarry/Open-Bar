package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.DefaultTheme;
import com.bar.gestioncocktail.repository.AppSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AppSettingsService {

    private final AppSettingsRepository appSettingsRepository;

    @Autowired
    public AppSettingsService(AppSettingsRepository appSettingsRepository) {
        this.appSettingsRepository = appSettingsRepository;
    }

    public AppSettings getSettings() {
        return appSettingsRepository.findById(AppSettings.SINGLETON_ID)
            .orElseGet(this::createDefaultSettings);
    }

    public AppSettings updateSettings(AppSettingsUpdateRequest request) {
        if (request.defaultTheme() == DefaultTheme.LIGHT) {
            throw new BusinessException(
                "Le thème clair n'est pas encore disponible (conception Figma en cours, cf. ticket #154)");
        }
        AppSettings current = getSettings();
        current.setPrimaryColor(request.primaryColor());
        current.setPrimaryColorStrong(request.primaryColorStrong());
        current.setLogoUrl(request.logoUrl());
        current.setEstablishmentName(request.establishmentName());
        current.setDefaultTheme(request.defaultTheme());
        return appSettingsRepository.save(current);
    }

    /**
     * Deux requêtes concurrentes peuvent trouver la table vide simultanément (ex: deux
     * tablettes qui bootent en même temps) — la seconde tentative de création tombe sur
     * une violation de contrainte de clé primaire (id fixe) plutôt que sur une vraie erreur.
     */
    private AppSettings createDefaultSettings() {
        try {
            return appSettingsRepository.save(new AppSettings());
        } catch (DataIntegrityViolationException e) {
            return appSettingsRepository.findById(AppSettings.SINGLETON_ID).orElseThrow(() -> e);
        }
    }
}
