package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.DefaultTheme;
import com.bar.gestioncocktail.repository.AppSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppSettingsServiceTest {

    @Mock
    AppSettingsRepository appSettingsRepository;

    @InjectMocks
    AppSettingsService appSettingsService;

    private AppSettings existing;

    @BeforeEach
    void setUp() {
        existing = new AppSettings();
        existing.setId(AppSettings.SINGLETON_ID);
        existing.setPrimaryColor("#6c7fe8");
        existing.setPrimaryColorStrong("#5a68d6");
        existing.setEstablishmentName("OpenBar");
        existing.setDefaultTheme(DefaultTheme.DARK);
    }

    @Test
    void getSettings_ligneExistante_laRetourneSansCreation() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));

        AppSettings result = appSettingsService.getSettings();

        assertThat(result).isEqualTo(existing);
    }

    @Test
    void getSettings_aucuneLigne_creeUneLigneParDefaut() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.empty());
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettings result = appSettingsService.getSettings();

        assertThat(result.getPrimaryColor()).isEqualTo("#6c7fe8");
        assertThat(result.getEstablishmentName()).isEqualTo("OpenBar");
        assertThat(result.getDefaultTheme()).isEqualTo(DefaultTheme.DARK);
    }

    @Test
    void getSettings_creationConcurrente_recupereLaLigneCreeeParLAutreRequete() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID))
            .thenReturn(Optional.empty())
            .thenReturn(Optional.of(existing));
        when(appSettingsRepository.save(any(AppSettings.class)))
            .thenThrow(new DataIntegrityViolationException("id déjà inséré par une requête concurrente"));

        AppSettings result = appSettingsService.getSettings();

        assertThat(result).isEqualTo(existing);
    }

    @Test
    void updateSettings_modifieLaLigneExistante_neCreePasDeNouvelId() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#ff0000", "#cc0000", "https://example.com/logo.png", "Le Bar Test", DefaultTheme.DARK, 5, 10
        );

        AppSettings result = appSettingsService.updateSettings(request);

        ArgumentCaptor<AppSettings> captor = ArgumentCaptor.forClass(AppSettings.class);
        verify(appSettingsRepository).save(captor.capture());

        assertThat(captor.getValue().getId()).isEqualTo(AppSettings.SINGLETON_ID);
        assertThat(result.getPrimaryColor()).isEqualTo("#ff0000");
        assertThat(result.getPrimaryColorStrong()).isEqualTo("#cc0000");
        assertThat(result.getLogoUrl()).isEqualTo("https://example.com/logo.png");
        assertThat(result.getEstablishmentName()).isEqualTo("Le Bar Test");
        assertThat(result.getDefaultTheme()).isEqualTo(DefaultTheme.DARK);
        assertThat(result.getTempsAlerteCommandeMinutes()).isEqualTo(5);
        assertThat(result.getTempsAlerteCritiqueCommandeMinutes()).isEqualTo(10);
    }

    @Test
    void updateSettings_metAJourLesTempsAlerteCommande() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#6c7fe8", "#5a68d6", null, "OpenBar", DefaultTheme.DARK, 7, 15
        );

        AppSettings result = appSettingsService.updateSettings(request);

        assertThat(result.getTempsAlerteCommandeMinutes()).isEqualTo(7);
        assertThat(result.getTempsAlerteCritiqueCommandeMinutes()).isEqualTo(15);
    }

    @Test
    void updateSettings_logoUrlNull_estAccepteCarOptionnel() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#6c7fe8", "#5a68d6", null, "OpenBar", DefaultTheme.DARK, 5, 10
        );

        AppSettings result = appSettingsService.updateSettings(request);

        assertThat(result.getLogoUrl()).isNull();
    }

    @Test
    void updateSettings_themeLight_estRejeteCarNonDesigneEncoreEnFigma() {
        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#6c7fe8", "#5a68d6", null, "OpenBar", DefaultTheme.LIGHT, 5, 10
        );

        assertThatThrownBy(() -> appSettingsService.updateSettings(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Light theme");
    }
}
