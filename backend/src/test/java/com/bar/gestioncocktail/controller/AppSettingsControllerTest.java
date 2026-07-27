package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.AppSettingsResponseDTO;
import com.bar.gestioncocktail.dto.AppSettingsUpdateRequest;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.DefaultTheme;
import com.bar.gestioncocktail.service.AppSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppSettingsControllerTest {

    @Mock
    AppSettingsService appSettingsService;

    @InjectMocks
    AppSettingsController appSettingsController;

    private AppSettings settings;

    @BeforeEach
    void setUp() {
        settings = new AppSettings();
        settings.setId(AppSettings.SINGLETON_ID);
        settings.setPrimaryColor("#6c7fe8");
        settings.setPrimaryColorStrong("#5a68d6");
        settings.setLogoUrl("https://example.com/logo.png");
        settings.setEstablishmentName("OpenBar");
        settings.setDefaultTheme(DefaultTheme.DARK);
        settings.setUpdatedAt(LocalDateTime.of(2026, 7, 9, 10, 0));
    }

    @Test
    void getSettings_delegueAuServiceEtRetourneLeDTO() {
        when(appSettingsService.getSettings()).thenReturn(settings);

        ResponseEntity<AppSettingsResponseDTO> response = appSettingsController.getSettings();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        AppSettingsResponseDTO body = java.util.Objects.requireNonNull(response.getBody());
        assertThat(body.primaryColor()).isEqualTo("#6c7fe8");
        assertThat(body.establishmentName()).isEqualTo("OpenBar");
    }

    @Test
    void updateSettings_delegueAuServiceAvecLaRequeteEtRetourneLeDTOMisAJour() {
        AppSettingsUpdateRequest request = new AppSettingsUpdateRequest(
            "#ff0000", "#cc0000", "https://example.com/new-logo.png", "Le Bar Test", DefaultTheme.DARK
        );
        AppSettings updated = new AppSettings();
        updated.setId(AppSettings.SINGLETON_ID);
        updated.setPrimaryColor("#ff0000");
        updated.setPrimaryColorStrong("#cc0000");
        updated.setLogoUrl("https://example.com/new-logo.png");
        updated.setEstablishmentName("Le Bar Test");
        updated.setDefaultTheme(DefaultTheme.DARK);
        when(appSettingsService.updateSettings(request)).thenReturn(updated);

        ResponseEntity<AppSettingsResponseDTO> response = appSettingsController.updateSettings(request);

        verify(appSettingsService).updateSettings(request);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        AppSettingsResponseDTO updatedBody = java.util.Objects.requireNonNull(response.getBody());
        assertThat(updatedBody.primaryColor()).isEqualTo("#ff0000");
        assertThat(updatedBody.establishmentName()).isEqualTo("Le Bar Test");
    }
}
