package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.LicenseActivateRequest;
import com.bar.gestioncocktail.dto.LicenseStatusDTO;
import com.bar.gestioncocktail.dto.LicenseSummaryDTO;
import com.bar.gestioncocktail.dto.LicenseSyncResultDTO;
import com.bar.gestioncocktail.model.LicenseStatus;
import com.bar.gestioncocktail.repository.UserRepository;
import com.bar.gestioncocktail.service.AuditLogService;
import com.bar.gestioncocktail.service.LicenseService;
import com.bar.gestioncocktail.service.LicenseSyncService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link LicenseController} verifying admin/staff endpoints and audit logging.
 */
@ExtendWith(MockitoExtension.class)
class LicenseControllerTest {

    @Mock
    private LicenseService licenseService;
    @Mock
    private LicenseSyncService licenseSyncService;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private UserRepository userRepository;

    private LicenseController controller;
    private LicenseStatusDTO sampleDto;

    @BeforeEach
    void setup() {
        controller = new LicenseController(licenseService, licenseSyncService, auditLogService, userRepository);
        sampleDto = new LicenseStatusDTO(
                LicenseStatus.VALID,
                "ENTERPRISE",
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
                "eyJ...xyz"
        );
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getLicenseStatus_returnsFullDto() {
        when(licenseService.getLicenseStatus()).thenReturn(sampleDto);

        ResponseEntity<LicenseStatusDTO> response = controller.getLicenseStatus();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(sampleDto);
    }

    @Test
    void getLicenseSummary_returnsLightweightSummary() {
        LicenseSummaryDTO summary = new LicenseSummaryDTO(
                LicenseStatus.GRACE_PERIOD, "PRO", Instant.now(), Instant.now().plusSeconds(7200), 2, true, true);
        when(licenseService.getLicenseSummary()).thenReturn(summary);

        ResponseEntity<LicenseSummaryDTO> response = controller.getLicenseSummary();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(summary);
    }

    @Test
    void activateOfflineLicense_activatesAndAudits() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", "pass", List.of()));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());
        when(licenseService.activateLicense("signed.jwt.token", "OFFLINE", "admin")).thenReturn(sampleDto);
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn("192.168.1.10");

        ResponseEntity<LicenseStatusDTO> response = controller.activateOfflineLicense(
                new LicenseActivateRequest("signed.jwt.token"), req);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(auditLogService).logAction(any(), eq("ACTIVATE_LICENSE_OFFLINE"), eq("LicenseRecord"), eq(1L), any(), eq("192.168.1.10"));
    }

    @Test
    void syncLicenseOnline_triggersSyncAndAudits() {
        LicenseSyncResultDTO syncRes = new LicenseSyncResultDTO(true, true, "SUCCESS", "Synced", sampleDto);
        when(licenseSyncService.syncNow("admin")).thenReturn(syncRes);

        ResponseEntity<LicenseSyncResultDTO> response = controller.syncLicenseOnline(null);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(syncRes);
        verify(auditLogService).logAction(any(), eq("SYNC_LICENSE_ONLINE"), eq("LicenseRecord"), eq(1L), any(), any());
    }

    @Test
    void deactivateLicense_clearsAndAudits() {
        when(licenseService.deactivateLicense()).thenReturn(sampleDto);

        ResponseEntity<LicenseStatusDTO> response = controller.deactivateLicense(null);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(auditLogService).logAction(any(), eq("DEACTIVATE_LICENSE"), eq("LicenseRecord"), eq(1L), any(), any());
    }
}
