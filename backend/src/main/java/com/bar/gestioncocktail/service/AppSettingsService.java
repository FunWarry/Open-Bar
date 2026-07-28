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

/**
 * Service métier gérant le singleton de configuration et de personnalisation visuelle de l'établissement (AppSettings).
 */
@Service
@Transactional
public class AppSettingsService {

    private final AppSettingsRepository appSettingsRepository;

    /**
     * Constructeur avec injection du repository de paramètres.
     *
     * @param appSettingsRepository Repository JPA des paramètres
     */
    @Autowired
    public AppSettingsService(AppSettingsRepository appSettingsRepository) {
        this.appSettingsRepository = appSettingsRepository;
    }

    /**
     * Récupère la configuration singleton actuelle de l'établissement.
     * Crée une configuration par défaut si aucune n'existe.
     *
     * @return L'instance singleton {@link AppSettings}
     */
    public AppSettings getSettings() {
        return appSettingsRepository.findById(AppSettings.SINGLETON_ID)
            .orElseGet(this::createDefaultSettings);
    }

    /**
     * Met à jour la configuration visuelle et le nom de l'établissement.
     *
     * @param request DTO contenant les nouvelles options de personnalisation
     * @return Les paramètres mis à jour
     * @throws BusinessException Si une règle métier est violée (ex: thème non supporté)
     */
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
     * Crée et sauvegarde une instance de paramètres par défaut.
     *
     * Deux requêtes concurrentes peuvent trouver la table vide simultanément (ex: deux
     * tablettes qui bootent en même temps) — la seconde tentative de création tombe sur
     * une violation de contrainte de clé primaire (id fixe) plutôt que sur une vraie erreur.
     *
     * @return Les paramètres créés ou récupérés
     */
    private AppSettings createDefaultSettings() {
        try {
            return appSettingsRepository.save(new AppSettings());
        } catch (DataIntegrityViolationException e) {
            return appSettingsRepository.findById(AppSettings.SINGLETON_ID).orElseThrow(() -> e);
        }
    }
}
