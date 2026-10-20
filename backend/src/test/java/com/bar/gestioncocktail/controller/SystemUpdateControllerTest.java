package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.SystemPreFlightDTO;
import com.bar.gestioncocktail.dto.SystemSnapshotDTO;
import com.bar.gestioncocktail.dto.SystemUpdateCheckDTO;
import com.bar.gestioncocktail.dto.SystemUpdateRequest;
import com.bar.gestioncocktail.dto.SystemUpdateStatusDTO;
import com.bar.gestioncocktail.dto.SystemVersionDTO;
import com.bar.gestioncocktail.dto.UpdateChannel;
import com.bar.gestioncocktail.service.SystemUpdateService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link SystemUpdateController}.
 */
@ExtendWith(MockitoExtension.class)
class SystemUpdateControllerTest {

    @Mock
    private SystemUpdateService systemUpdateService;

    @InjectMocks
    private SystemUpdateController controller;

    @Test
    @DisplayName("getVersionInfo - returns 200 OK with system version and host metrics")
    void getVersionInfo_returnsVersionDetails() {
        SystemVersionDTO dto = new SystemVersionDTO("1.0.0", "22", "Linux (amd64)", 3600L, 50000000000L, 100000000000L);
        when(systemUpdateService.getSystemVersionInfo()).thenReturn(dto);

        ResponseEntity<SystemVersionDTO> response = controller.getVersionInfo();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().currentVersion()).isEqualTo("1.0.0");
        verify(systemUpdateService).getSystemVersionInfo();
    }

    @Test
    @DisplayName("checkForUpdates - returns 200 OK with update availability DTO")
    void checkForUpdates_returnsUpdateCheck() {
        SystemUpdateCheckDTO dto = new SystemUpdateCheckDTO(
                true, "1.0.0", "1.1.0", UpdateChannel.STABLE, "Release 1.1.0", "Notes",
                LocalDateTime.now(), "https://github.com", false, "Update available"
        );
        when(systemUpdateService.checkForUpdates(UpdateChannel.STABLE)).thenReturn(dto);

        ResponseEntity<SystemUpdateCheckDTO> response = controller.checkForUpdates(UpdateChannel.STABLE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().hasUpdate()).isTrue();
        verify(systemUpdateService).checkForUpdates(UpdateChannel.STABLE);
    }

    @Test
    @DisplayName("getPreFlight - returns 200 OK with runtime safety pre-flight check")
    void getPreFlight_returnsPreFlightCheck() {
        SystemPreFlightDTO dto = new SystemPreFlightDTO(
                true, 20000000000L, 1024L * 1024L * 1024L, true, 0L, 0L, List.of()
        );
        when(systemUpdateService.getPreFlightCheck()).thenReturn(dto);

        ResponseEntity<SystemPreFlightDTO> response = controller.getPreFlight();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().canProceed()).isTrue();
        verify(systemUpdateService).getPreFlightCheck();
    }

    @Test
    @DisplayName("triggerUpdate - initiates OTA update and returns running status DTO")
    void triggerUpdate_returnsRunningStatus() {
        SystemUpdateRequest request = new SystemUpdateRequest("1.1.0", UpdateChannel.STABLE);
        SystemUpdateStatusDTO status = new SystemUpdateStatusDTO(
                "RUNNING", "PREFLIGHT", 10, "Starting...", "1.0.0", "1.1.0",
                UpdateChannel.STABLE, "snapshot_1", LocalDateTime.now(), null, null, List.of()
        );
        when(systemUpdateService.triggerUpdate(request)).thenReturn(status);

        ResponseEntity<SystemUpdateStatusDTO> response = controller.triggerUpdate(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo("RUNNING");
        verify(systemUpdateService).triggerUpdate(request);
    }

    @Test
    @DisplayName("listSnapshots - returns list of archived database snapshots")
    void listSnapshots_returnsSnapshotsList() {
        SystemSnapshotDTO snapshot = new SystemSnapshotDTO(
                "snapshot_1", "snapshot_1.sql.gz", 10000000L, LocalDateTime.now(), "1.0.0", "1.1.0", "VALID"
        );
        when(systemUpdateService.listSnapshots()).thenReturn(List.of(snapshot));

        ResponseEntity<List<SystemSnapshotDTO>> response = controller.listSnapshots();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        verify(systemUpdateService).listSnapshots();
    }

    @Test
    @DisplayName("restoreSnapshot - restores snapshot and returns 200 OK")
    void restoreSnapshot_delegatesToService() {
        when(systemUpdateService.restoreSnapshot("snapshot_1")).thenReturn(Map.of("message", "Restored"));

        ResponseEntity<Map<String, String>> response = controller.restoreSnapshot("snapshot_1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("message", "Restored");
        verify(systemUpdateService).restoreSnapshot("snapshot_1");
    }

    @Test
    @DisplayName("deleteSnapshot - deletes snapshot and returns 204 No Content")
    void deleteSnapshot_returnsNoContent() {
        ResponseEntity<Void> response = controller.deleteSnapshot("snapshot_1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(systemUpdateService).deleteSnapshot("snapshot_1");
    }
}
