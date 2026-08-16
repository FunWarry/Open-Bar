package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EstablishmentConfigDTO;
import com.bar.gestioncocktail.dto.EstablishmentConfigUpdateRequest;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.EstablishmentConfig;
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
            "10 rue Test", "0102030405", "email@test.fr",
            "Immediate", "No discount", new BigDecimal("0.12"),
            "Europe/Paris", "58mm"
        );

        EstablishmentConfigDTO dto = service.updateConfig(request);

        assertThat(dto).isNotNull();
        assertThat(dto.legalName()).isEqualTo("Nouveau Nom SARL");
        assertThat(dto.legalForm()).isEqualTo("SAS");
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
            "12 Rue du Bar", "+33123456789", "contact@openbar.local",
            "Immediate payment", "None", new BigDecimal("0.12"),
            "SYSTEM", "80mm"
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
            "Adresse", "01", "a@b.fr", "Terms", "Policy", new BigDecimal("0.1"),
            "SYSTEM", "80mm"
        );

        assertThatThrownBy(() -> service.updateConfig(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("SIRET number is invalid");
    }
}
