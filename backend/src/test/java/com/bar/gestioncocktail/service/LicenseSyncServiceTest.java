package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.config.LicenseProperties;
import com.bar.gestioncocktail.dto.LicenseStatusDTO;
import com.bar.gestioncocktail.dto.LicenseSyncResultDTO;
import com.bar.gestioncocktail.model.LicenseStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link LicenseSyncService} verifying online token synchronization,
 * offline air-gapped resilience, and invalid server payload rejection.
 */
@ExtendWith(MockitoExtension.class)
class LicenseSyncServiceTest {

    @Mock
    private LicenseService licenseService;
    @Mock
    private HttpClient httpClient;
    @Mock
    private HttpResponse<String> mockHttpResponse;

    private LicenseProperties properties;
    private LicenseSyncService syncService;
    private LicenseStatusDTO sampleStatus;

    @BeforeEach
    void setup() {
        properties = new LicenseProperties();
        properties.setSyncUrl("https://licensing.open-bar.eu/api/v1/licenses/sync");
        properties.setSyncEnabled(true);
        properties.setSyncTimeoutMs(3000);

        syncService = new LicenseSyncService(
                licenseService,
                properties,
                new ObjectMapper(),
                httpClient,
                "0.8.0"
        );

        sampleStatus = new LicenseStatusDTO(
                LicenseStatus.VALID,
                "PRO",
                "73282932000074",
                "73282932000074",
                Instant.now(),
                Instant.now().plusSeconds(864000),
                Instant.now().plusSeconds(1036800),
                10,
                0,
                List.of("*"),
                true,
                true,
                true,
                null,
                "NONE",
                null,
                "OFFLINE",
                "admin",
                "AA:BB",
                "eyJ...123"
        );
    }

    @Test
    void syncNow_validNewTokenReturned_activatesOnlineLicense() throws Exception {
        when(licenseService.resolveVenueEstablishmentId()).thenReturn("73282932000074");
        when(licenseService.getStoredToken()).thenReturn("old.jwt.token");
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"licenseToken\":\"new.signed.jwt\"}");
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenReturn(mockHttpResponse);
        when(licenseService.activateLicense("new.signed.jwt", "ONLINE", "admin")).thenReturn(sampleStatus);

        LicenseSyncResultDTO result = syncService.syncNow("admin");

        assertThat(result.synced()).isTrue();
        assertThat(result.reachable()).isTrue();
        assertThat(result.syncStatus()).isEqualTo("SUCCESS");
        verify(licenseService).activateLicense("new.signed.jwt", "ONLINE", "admin");
    }

    @Test
    void syncNow_networkUnreachable_failsOpenAsOffline() throws Exception {
        when(licenseService.resolveVenueEstablishmentId()).thenReturn("73282932000074");
        when(licenseService.getStoredToken()).thenReturn("existing.jwt.token");
        when(licenseService.getLicenseStatus()).thenReturn(sampleStatus);
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenThrow(new IOException("Connection refused"));

        LicenseSyncResultDTO result = syncService.syncNow("admin");

        assertThat(result.synced()).isFalse();
        assertThat(result.reachable()).isFalse();
        assertThat(result.syncStatus()).isEqualTo("OFFLINE");
        verify(licenseService).recordSyncAttempt(eq("OFFLINE"), any());
        verify(licenseService, never()).deactivateLicense();
    }

    @Test
    void syncNow_http204NoContent_reportsUpToDate() throws Exception {
        when(licenseService.resolveVenueEstablishmentId()).thenReturn("73282932000074");
        when(licenseService.getStoredToken()).thenReturn("existing.jwt.token");
        when(licenseService.getLicenseStatus()).thenReturn(sampleStatus);
        when(mockHttpResponse.statusCode()).thenReturn(204);
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenReturn(mockHttpResponse);

        LicenseSyncResultDTO result = syncService.syncNow("admin");

        assertThat(result.synced()).isFalse();
        assertThat(result.reachable()).isTrue();
        assertThat(result.syncStatus()).isEqualTo("UP_TO_DATE");
        verify(licenseService).recordSyncAttempt("UP_TO_DATE", null);
    }

    @Test
    void syncNow_serverReturnsHttp500_recordsFailedWithoutRevoking() throws Exception {
        when(licenseService.resolveVenueEstablishmentId()).thenReturn("73282932000074");
        when(licenseService.getStoredToken()).thenReturn("existing.jwt.token");
        when(licenseService.getLicenseStatus()).thenReturn(sampleStatus);
        when(mockHttpResponse.statusCode()).thenReturn(500);
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenReturn(mockHttpResponse);

        LicenseSyncResultDTO result = syncService.syncNow("admin");

        assertThat(result.synced()).isFalse();
        assertThat(result.reachable()).isTrue();
        assertThat(result.syncStatus()).isEqualTo("FAILED");
        verify(licenseService).recordSyncAttempt("FAILED", "Licensing server returned HTTP 500");
        verify(licenseService, never()).deactivateLicense();
    }

    @Test
    void syncNow_blankOrInvalidUrlAndSameTokenAndInterrupted_covered() throws Exception {
        properties.setSyncUrl("");
        when(licenseService.getLicenseStatus()).thenReturn(sampleStatus);
        assertThat(syncService.syncNow("admin").syncStatus()).isEqualTo("OFFLINE");

        properties.setSyncUrl("ftp://invalid.example.com/sync");
        assertThat(syncService.syncNow("admin").syncStatus()).isEqualTo("FAILED");

        properties.setSyncUrl("https://licensing.open-bar.eu/api/v1/licenses/sync");
        when(licenseService.resolveVenueEstablishmentId()).thenReturn("73282932000074");
        when(licenseService.getStoredToken()).thenReturn("same.jwt.token");
        when(mockHttpResponse.statusCode()).thenReturn(200);
        when(mockHttpResponse.body()).thenReturn("{\"token\":\"same.jwt.token\"}");
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenReturn(mockHttpResponse);
        assertThat(syncService.syncNow("admin").syncStatus()).isEqualTo("UP_TO_DATE");

        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenThrow(new InterruptedException("interrupted"));
        assertThat(syncService.syncNow("admin").syncStatus()).isEqualTo("OFFLINE");
        Thread.interrupted();
    }

    @Test
    void scheduledSync_respectsSyncEnabledFlag() {
        properties.setSyncEnabled(false);
        syncService.scheduledSync();
        verify(licenseService).touchClockHighWaterMark();
    }
}
