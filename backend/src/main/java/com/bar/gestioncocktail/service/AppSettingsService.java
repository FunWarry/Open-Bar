package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.repository.AppSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
            .orElseGet(() -> appSettingsRepository.save(new AppSettings()));
    }

    public AppSettings updateSettings(AppSettings updated) {
        AppSettings current = getSettings();
        current.setPrimaryColor(updated.getPrimaryColor());
        current.setPrimaryColorStrong(updated.getPrimaryColorStrong());
        current.setLogoUrl(updated.getLogoUrl());
        current.setEstablishmentName(updated.getEstablishmentName());
        current.setDefaultTheme(updated.getDefaultTheme());
        return appSettingsRepository.save(current);
    }
}
