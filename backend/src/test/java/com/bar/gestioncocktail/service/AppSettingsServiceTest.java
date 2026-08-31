package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.AppSettingsResponseDTO;
import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.DefaultTheme;
import com.bar.gestioncocktail.repository.AppSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

    @Mock
    NotificationService notificationService;

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
        existing.setTempsAlerteWarningMinutes(3);
        existing.setTempsAlerteCommandeMinutes(5);
        existing.setTempsAlerteCritiqueCommandeMinutes(10);
    }

    @Test
    @DisplayName("getSettings returns existing singleton row without recreating")
    void getSettings_existingRow_returnsWithoutCreation() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));

        AppSettings result = appSettingsService.getSettings();

        assertThat(result).isEqualTo(existing);
    }

    @Test
    @DisplayName("getSettings creates default row when none exists")
    void getSettings_noRow_createsDefaultRow() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.empty());
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettings result = appSettingsService.getSettings();

        assertThat(result.getPrimaryColor()).isEqualTo("#6c7fe8");
        assertThat(result.getEstablishmentName()).isEqualTo("OpenBar");
        assertThat(result.getDefaultTheme()).isEqualTo(DefaultTheme.DARK);
        assertThat(result.getTempsAlerteWarningMinutes()).isEqualTo(3);
        assertThat(result.getTempsAlerteCommandeMinutes()).isEqualTo(5);
        assertThat(result.getTempsAlerteCritiqueCommandeMinutes()).isEqualTo(10);
    }

    @Test
    @DisplayName("getSettings handles concurrent creation race condition gracefully")
    void getSettings_concurrentCreation_recoversRowCreatedByConcurrentRequest() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID))
            .thenReturn(Optional.empty())
            .thenReturn(Optional.of(existing));
        when(appSettingsRepository.save(any(AppSettings.class)))
            .thenThrow(new DataIntegrityViolationException("ID already inserted by concurrent request"));

        AppSettings result = appSettingsService.getSettings();

        assertThat(result).isEqualTo(existing);
    }

    @Test
    @DisplayName("updateSettings modifies existing entity, broadcasts STOMP event, and preserves singleton ID")
    void updateSettings_modifiesExistingRow_andBroadcastsStomp() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#ff0000", "#cc0000", "https://example.com/logo.png", "The Test Bar", DefaultTheme.DARK,
            "USD", "$", com.bar.gestioncocktail.model.CurrencyPosition.BEFORE,
            2, 6, 12,
            "https://openbar.lan", "OpenBar-Guest", "SecretPass", "WPA", true
        );

        AppSettings result = appSettingsService.updateSettings(request);

        ArgumentCaptor<AppSettings> captor = ArgumentCaptor.forClass(AppSettings.class);
        verify(appSettingsRepository).save(captor.capture());
        verify(notificationService).notifierParametresMisAJour(any(AppSettingsResponseDTO.class));

        assertThat(captor.getValue().getId()).isEqualTo(AppSettings.SINGLETON_ID);
        assertThat(result.getPrimaryColor()).isEqualTo("#ff0000");
        assertThat(result.getPrimaryColorStrong()).isEqualTo("#cc0000");
        assertThat(result.getLogoUrl()).isEqualTo("https://example.com/logo.png");
        assertThat(result.getEstablishmentName()).isEqualTo("The Test Bar");
        assertThat(result.getDefaultTheme()).isEqualTo(DefaultTheme.DARK);
        assertThat(result.getCurrencyCode()).isEqualTo("USD");
        assertThat(result.getCurrencySymbol()).isEqualTo("$");
        assertThat(result.getCurrencyPosition()).isEqualTo(com.bar.gestioncocktail.model.CurrencyPosition.BEFORE);
        assertThat(result.getTempsAlerteWarningMinutes()).isEqualTo(2);
        assertThat(result.getTempsAlerteCommandeMinutes()).isEqualTo(6);
        assertThat(result.getTempsAlerteCritiqueCommandeMinutes()).isEqualTo(12);
        assertThat(result.getClientBaseUrl()).isEqualTo("https://openbar.lan");
        assertThat(result.getWifiSsid()).isEqualTo("OpenBar-Guest");
        assertThat(result.getWifiPassword()).isEqualTo("SecretPass");
        assertThat(result.getWifiSecurity()).isEqualTo("WPA");
        assertThat(result.getWifiEnabled()).isTrue();
    }

    @Test
    @DisplayName("updateSettings updates currency configuration to GBP")
    void updateSettings_updatesCurrencyConfiguration() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#6c7fe8", "#5a68d6", null, "OpenBar", DefaultTheme.DARK,
            "GBP", "£", com.bar.gestioncocktail.model.CurrencyPosition.BEFORE,
            3, 5, 10,
            null, null, null, null, null
        );

        AppSettings result = appSettingsService.updateSettings(request);

        assertThat(result.getCurrencyCode()).isEqualTo("GBP");
        assertThat(result.getCurrencySymbol()).isEqualTo("£");
        assertThat(result.getCurrencyPosition()).isEqualTo(com.bar.gestioncocktail.model.CurrencyPosition.BEFORE);
    }

    @Test
    @DisplayName("updateSettings updates order alert thresholds successfully")
    void updateSettings_updatesOrderAlertThresholds() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#6c7fe8", "#5a68d6", null, "OpenBar", DefaultTheme.DARK,
            null, null, null,
            4, 8, 15,
            null, null, null, null, null
        );

        AppSettings result = appSettingsService.updateSettings(request);

        assertThat(result.getTempsAlerteWarningMinutes()).isEqualTo(4);
        assertThat(result.getTempsAlerteCommandeMinutes()).isEqualTo(8);
        assertThat(result.getTempsAlerteCritiqueCommandeMinutes()).isEqualTo(15);
    }

    @Test
    @DisplayName("updateSettings rejects invalid threshold order where warning >= urgent")
    void updateSettings_warningGreaterThanOrEqualToUrgent_throwsBusinessException() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));

        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#6c7fe8", "#5a68d6", null, "OpenBar", DefaultTheme.DARK,
            null, null, null,
            5, 5, 10,
            null, null, null, null, null
        );

        assertThatThrownBy(() -> appSettingsService.updateSettings(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Warning alert threshold");
    }

    @Test
    @DisplayName("updateSettings rejects invalid threshold order where urgent >= critical")
    void updateSettings_urgentGreaterThanOrEqualToCritical_throwsBusinessException() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));

        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#6c7fe8", "#5a68d6", null, "OpenBar", DefaultTheme.DARK,
            null, null, null,
            3, 10, 10,
            null, null, null, null, null
        );

        assertThatThrownBy(() -> appSettingsService.updateSettings(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("strictly less than");
    }

    @Test
    @DisplayName("updateSettings accepts null logoUrl as it is optional")
    void updateSettings_nullLogoUrl_acceptedAsOptional() {
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#6c7fe8", "#5a68d6", null, "OpenBar", DefaultTheme.DARK,
            null, null, null,
            3, 5, 10,
            null, null, null, null, null
        );

        AppSettings result = appSettingsService.updateSettings(request);

        assertThat(result.getLogoUrl()).isNull();
    }

    @Test
    @DisplayName("updateSettings successfully updates defaultTheme to LIGHT")
    void updateSettings_lightTheme_success() {
        AppSettings current = new AppSettings();
        current.setDefaultTheme(DefaultTheme.DARK);
        when(appSettingsRepository.findById(AppSettings.SINGLETON_ID)).thenReturn(Optional.of(current));
        when(appSettingsRepository.save(any(AppSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#6c7fe8", "#5a68d6", null, "OpenBar", DefaultTheme.LIGHT,
            null, null, null,
            3, 5, 10,
            null, null, null, null, null
        );

        AppSettings updated = appSettingsService.updateSettings(request);

        assertThat(updated.getDefaultTheme()).isEqualTo(DefaultTheme.LIGHT);
        verify(appSettingsRepository).save(any(AppSettings.class));
    }
}
