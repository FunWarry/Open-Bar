package com.bar.gestioncocktail.service;

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

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
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
    void updateSettings_modifieLaLigneExistante_neCreePasDeNouvelId() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettings update = new AppSettings();
        update.setPrimaryColor("#ff0000");
        update.setPrimaryColorStrong("#cc0000");
        update.setLogoUrl("https://example.com/logo.png");
        update.setEstablishmentName("Le Bar Test");
        update.setDefaultTheme(DefaultTheme.LIGHT);

        AppSettings result = appSettingsService.updateSettings(update);

        ArgumentCaptor<AppSettings> captor = ArgumentCaptor.forClass(AppSettings.class);
        verify(appSettingsRepository).save(captor.capture());

        assertThat(captor.getValue().getId()).isEqualTo(AppSettings.SINGLETON_ID);
        assertThat(result.getPrimaryColor()).isEqualTo("#ff0000");
        assertThat(result.getPrimaryColorStrong()).isEqualTo("#cc0000");
        assertThat(result.getLogoUrl()).isEqualTo("https://example.com/logo.png");
        assertThat(result.getEstablishmentName()).isEqualTo("Le Bar Test");
        assertThat(result.getDefaultTheme()).isEqualTo(DefaultTheme.LIGHT);
    }

    @Test
    void updateSettings_logoUrlNull_estAccepteCarOptionnel() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettings update = new AppSettings();
        update.setPrimaryColor("#6c7fe8");
        update.setPrimaryColorStrong("#5a68d6");
        update.setLogoUrl(null);
        update.setEstablishmentName("OpenBar");
        update.setDefaultTheme(DefaultTheme.DARK);

        AppSettings result = appSettingsService.updateSettings(update);

        assertThat(result.getLogoUrl()).isNull();
    }
}
