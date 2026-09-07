package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EstablishmentConfigDTO;
import com.bar.gestioncocktail.dto.EstablishmentConfigUpdateRequest;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.EstablishmentConfig;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.repository.EstablishmentConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EstablishmentConfigServiceTest {

    @Mock
    private EstablishmentConfigRepository repository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private EstablishmentConfigService service;

    private EstablishmentConfig config;

    @BeforeEach
    void setUp() {
        config = new EstablishmentConfig();
        config.setId(1L);
        config.setLegalName("OpenBar SARL");
        config.setSiret("73282932000074"); // Valid SIRET (Luhn ok)
        config.setTvaNumber("FR12732829320");
    }

    @Test
    void getConfig_retourneInstanceExistanteOuParDefaut() {
        when(repository.findById(1L)).thenReturn(Optional.of(config));

        EstablishmentConfig result = service.getConfig();

        assertThat(result).isNotNull();
        assertThat(result.getLegalName()).isEqualTo("OpenBar SARL");
    }

    @Test
    void updateConfig_avecSiretValide_metAJourConfiguration() {
        when(repository.findById(1L)).thenReturn(Optional.of(config));
        when(repository.save(any(EstablishmentConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EstablishmentConfigUpdateRequest request = new EstablishmentConfigUpdateRequest(
            "Nouveau Nom SARL", "SAS", "73282932000074", "Paris", "B 123",
            "FR12732829320", "5630Z", new BigDecimal("15000"),
            "10 rue Test", "France", "fr", "0102030405", "email@test.fr",
            "Immediate", "No discount", new BigDecimal("0.12"),
            "Europe/Paris", "58mm", null
        );

        EstablishmentConfigDTO dto = service.updateConfig(request);

        assertThat(dto).isNotNull();
        assertThat(dto.legalName()).isEqualTo("Nouveau Nom SARL");
        assertThat(dto.legalForm()).isEqualTo("SAS");
        assertThat(dto.country()).isEqualTo("France");
        assertThat(dto.language()).isEqualTo("fr");
        assertThat(dto.timeZone()).isEqualTo("Europe/Paris");
        assertThat(dto.ticketFormat()).isEqualTo("58mm");
        verify(repository).save(any(EstablishmentConfig.class));
    }

    @Test
    void updateConfig_avecTicketFormatValide80mm_metAJourFormat() {
        when(repository.findById(1L)).thenReturn(Optional.of(config));
        when(repository.save(any(EstablishmentConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EstablishmentConfigUpdateRequest request = new EstablishmentConfigUpdateRequest(
            "OpenBar SARL", "SARL", "73282932000074", "Paris", "B 123",
            "FR12732829320", "5630Z", new BigDecimal("10000"),
            "12 Rue du Bar", "France", "fr", "+33123456789", "contact@openbar.local",
            "Immediate payment", "None", new BigDecimal("0.12"),
            "SYSTEM", "80mm", null
        );

        EstablishmentConfigDTO dto = service.updateConfig(request);

        assertThat(dto).isNotNull();
        assertThat(dto.ticketFormat()).isEqualTo("80mm");
    }

    @Test
    void updateConfig_avecSiretInvalide_leveBusinessException() {
        // Invalid Luhn SIRET
        EstablishmentConfigUpdateRequest request = new EstablishmentConfigUpdateRequest(
            "Nom", "SARL", "12345678900000", "Paris", "B 123",
            "FR12732829320", "5630Z", new BigDecimal("10000"),
            "Adresse", "France", "fr", "01", "a@b.fr", "Terms", "Policy", new BigDecimal("0.1"),
            "SYSTEM", "80mm", null
        );

        assertThatThrownBy(() -> service.updateConfig(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("SIRET number is invalid");
    }

    @Test
    void getModulesDTO_retourneModulesValides() {
        when(repository.findById(1L)).thenReturn(Optional.of(config));

        var modules = service.getModulesDTO();

        assertThat(modules).isNotNull();
        assertThat(modules.cuisineKds()).isTrue();
        assertThat(modules.happyHour()).isTrue();
    }

    @Test
    void updateModules_metAJourEtNotifieWebSocket() {
        when(repository.findById(1L)).thenReturn(Optional.of(config));
        when(repository.save(any(EstablishmentConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var updateReq = new com.bar.gestioncocktail.dto.EstablishmentModulesUpdateRequest(
            false, true, false, true, false, true
        );

        var updated = service.updateModules(updateReq);

        assertThat(updated.cuisineKds()).isFalse();
        assertThat(updated.happyHour()).isTrue();
        verify(notificationService).notifierModulesMisAJour(any());
    }

    @Test
    void getConfig_avecSiretInvalideEnBase_corrigeAutomatiquementSiret() {
        EstablishmentConfig legacyConfig = new EstablishmentConfig();
        legacyConfig.setId(1L);
        legacyConfig.setSiret("12345678900010"); // Invalid Luhn
        when(repository.findById(1L)).thenReturn(Optional.of(legacyConfig));
        when(repository.save(any(EstablishmentConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EstablishmentConfig result = service.getConfig();

        assertThat(result).isNotNull();
        assertThat(result.getSiret()).isEqualTo("73282932000074");
    }

    @Test
    void updateModules_avecNullRequest_retourneModulesActuelsSansSauvegarde() {
        when(repository.findById(1L)).thenReturn(Optional.of(config));

        var result = service.updateModules(null);

        assertThat(result).isNotNull();
        assertThat(result.cuisineKds()).isTrue();
    }

    @Test
    void isModuleEnabled_verifieTousLesModules() {
        when(repository.findById(1L)).thenReturn(Optional.of(config));

        assertThat(service.isModuleEnabled(EstablishmentModule.CUISINE_KDS)).isTrue();
        assertThat(service.isModuleEnabled(EstablishmentModule.HAPPY_HOUR)).isTrue();
        assertThat(service.isModuleEnabled(EstablishmentModule.EMPLOYEE_MANAGEMENT)).isTrue();
        assertThat(service.isModuleEnabled(EstablishmentModule.FLOOR_PLAN)).isTrue();
        assertThat(service.isModuleEnabled(EstablishmentModule.QR_CLIENT_ORDERING)).isTrue();
        assertThat(service.isModuleEnabled(EstablishmentModule.STOCK_TRACKING)).isTrue();
        assertThat(service.isModuleEnabled(null)).isTrue();

        config.setModuleKitchenKdsEnabled(false);
        assertThat(service.isModuleEnabled(EstablishmentModule.CUISINE_KDS)).isFalse();
    }

    @Test
    void checkModuleEnabled_lanceBusinessExceptionSiDesactive() {
        config.setModuleFloorPlanEnabled(false);
        when(repository.findById(1L)).thenReturn(Optional.of(config));

        assertThatThrownBy(() -> service.checkModuleEnabled(EstablishmentModule.FLOOR_PLAN))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("FLOOR_PLAN");

        // When enabled, must not throw
        config.setModuleHappyHourEnabled(true);
        service.checkModuleEnabled(EstablishmentModule.HAPPY_HOUR);
    }
}
