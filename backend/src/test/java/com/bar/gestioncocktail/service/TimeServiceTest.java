package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.EstablishmentConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TimeServiceTest {

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @InjectMocks
    private TimeService timeService;

    private EstablishmentConfig config;

    @BeforeEach
    void setUp() {
        config = new EstablishmentConfig();
    }

    @Test
    void getZoneId_quandTimeZoneEstSYSTEM_retourneSystemDefault() {
        config.setTimeZone("SYSTEM");
        when(establishmentConfigService.getConfig()).thenReturn(config);

        ZoneId zoneId = timeService.getZoneId();

        assertThat(zoneId).isEqualTo(ZoneId.systemDefault());
    }

    @Test
    void getZoneId_quandTimeZoneEstSpecific_retourneCeZoneId() {
        config.setTimeZone("Europe/Paris");
        when(establishmentConfigService.getConfig()).thenReturn(config);

        ZoneId zoneId = timeService.getZoneId();

        assertThat(zoneId).isEqualTo(ZoneId.of("Europe/Paris"));
    }

    @Test
    void getZoneId_quandExceptionOuNull_retourneSystemDefault() {
        when(establishmentConfigService.getConfig()).thenThrow(new RuntimeException("Config error"));

        ZoneId zoneId = timeService.getZoneId();

        assertThat(zoneId).isEqualTo(ZoneId.systemDefault());
    }

    @Test
    void now_et_today_retournentDatesValides() {
        config.setTimeZone("UTC");
        when(establishmentConfigService.getConfig()).thenReturn(config);

        LocalDateTime now = timeService.now();
        LocalDate today = timeService.today();

        assertThat(now).isNotNull();
        assertThat(today).isNotNull();
    }

    @Test
    void getAvailableTimeZones_retourneListeActive() {
        List<String> zones = timeService.getAvailableTimeZones();

        assertThat(zones).contains("SYSTEM", "Europe/Paris", "UTC", "America/New_York");
    }
}
