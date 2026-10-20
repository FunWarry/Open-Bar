package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.SystemPreFlightDTO;
import com.bar.gestioncocktail.dto.SystemSnapshotDTO;
import com.bar.gestioncocktail.dto.SystemUpdateCheckDTO;
import com.bar.gestioncocktail.dto.SystemUpdateRequest;
import com.bar.gestioncocktail.dto.SystemUpdateStatusDTO;
import com.bar.gestioncocktail.dto.SystemVersionDTO;
import com.bar.gestioncocktail.dto.UpdateChannel;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link SystemUpdateService}.
 */
@ExtendWith(MockitoExtension.class)
class SystemUpdateServiceTest {

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private TableRepository tableRepository;

    @Mock
    private CommandeRepository commandeRepository;

    private ObjectMapper objectMapper;
    private SystemUpdateService service;

    @TempDir
    Path tempDir;

    private Path backupDir;
    private Path statusFile;

    @BeforeEach
    void setUp() throws IOException {
        objectMapper = new ObjectMapper();
        backupDir = tempDir.resolve("backups");
        Files.createDirectories(backupDir);
        statusFile = backupDir.resolve("update-status.json");

        service = new SystemUpdateService(
                establishmentConfigService,
                tableRepository,
                commandeRepository,
                objectMapper,
                "0.8.0",
                "scripts/ota-update.sh",
                "scripts/ota-update.ps1",
                backupDir.toString(),
                statusFile.toString()
        );
    }

    @Test
    @DisplayName("getSystemVersionInfo - returns host runtime details and configured version")
    void getSystemVersionInfo_returnsSystemMetrics() {
        SystemVersionDTO info = service.getSystemVersionInfo();

        assertThat(info).isNotNull();
        assertThat(info.currentVersion()).isEqualTo("0.8.0");
        assertThat(info.javaVersion()).isNotBlank();
        assertThat(info.osName()).isNotBlank();
        assertThat(info.totalDiskBytes()).isGreaterThan(0L);
    }

    @Test
    @DisplayName("getPreFlightCheck - returns safe status when disk is sufficient and no tables occupied")
    void getPreFlightCheck_returnsSafeWhenNoBlockers() {
        when(tableRepository.findByOccupee(true)).thenReturn(Collections.emptyList());
        when(commandeRepository.countByStatutIn(any())).thenReturn(0L);

        SystemPreFlightDTO preflight = service.getPreFlightCheck();

        assertThat(preflight).isNotNull();
        assertThat(preflight.occupiedTablesCount()).isZero();
        assertThat(preflight.activeOrdersCount()).isZero();
    }

    @Test
    @DisplayName("getPreFlightCheck - adds advisory warnings when tables are occupied or orders active")
    void getPreFlightCheck_addsWarningsWhenTablesOccupied() {
        TableEntity table = new TableEntity();
        table.setOccupee(true);
        when(tableRepository.findByOccupee(true)).thenReturn(List.of(table));
        when(commandeRepository.countByStatutIn(any())).thenReturn(3L);

        SystemPreFlightDTO preflight = service.getPreFlightCheck();

        assertThat(preflight).isNotNull();
        assertThat(preflight.occupiedTablesCount()).isEqualTo(1L);
        assertThat(preflight.activeOrdersCount()).isEqualTo(3L);
        assertThat(preflight.warnings()).anyMatch(w -> w.contains("table(s)"));
        assertThat(preflight.warnings()).anyMatch(w -> w.contains("commande(s)"));
    }

    @Test
    @DisplayName("checkForUpdates - returns offline fallback when GitHub API is unreachable")
    void checkForUpdates_returnsOfflineFallbackGracefully() {
        SystemUpdateCheckDTO check = service.checkForUpdates(UpdateChannel.STABLE);

        assertThat(check).isNotNull();
        assertThat(check.currentVersion()).isEqualTo("0.8.0");
        assertThat(check.channel()).isEqualTo(UpdateChannel.STABLE);
    }

    @Test
    @DisplayName("triggerUpdate - throws BusinessException when SYSTEM_UPDATES module is disabled")
    void triggerUpdate_throwsWhenModuleDisabled() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)).thenReturn(false);

        SystemUpdateRequest request = new SystemUpdateRequest("0.8.1", UpdateChannel.STABLE);

        assertThatThrownBy(() -> service.triggerUpdate(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("System Updates module is disabled");
    }

    @Test
    @DisplayName("listSnapshots - returns parsed snapshots and metadata sorted newest first")
    void listSnapshots_returnsArchivedSnapshots() throws IOException {
        String snapshotId1 = "openbar_pre_update_0.7.0_20260901_120000";
        String snapshotId2 = "openbar_pre_update_0.8.0_20261001_120000";

        Files.writeString(backupDir.resolve(snapshotId1 + ".sql.gz"), "dummy-content-1");
        Files.writeString(backupDir.resolve(snapshotId2 + ".sql.gz"), "dummy-content-2");

        Files.writeString(backupDir.resolve(snapshotId1 + ".meta.json"),
                "{\"fromVersion\":\"0.7.0\",\"targetVersion\":\"0.7.2\",\"timestamp\":\"2026-09-01T12:00:00\"}");
        Files.writeString(backupDir.resolve(snapshotId2 + ".meta.json"),
                "{\"fromVersion\":\"0.8.0\",\"targetVersion\":\"0.8.1\",\"timestamp\":\"2026-10-01T12:00:00\"}");

        List<SystemSnapshotDTO> snapshots = service.listSnapshots();

        assertThat(snapshots).hasSize(2);
        assertThat(snapshots.get(0).snapshotId()).isEqualTo(snapshotId2);
        assertThat(snapshots.get(0).fromVersion()).isEqualTo("0.8.0");
        assertThat(snapshots.get(0).targetVersion()).isEqualTo("0.8.1");
        assertThat(snapshots.get(1).snapshotId()).isEqualTo(snapshotId1);
    }

    @Test
    @DisplayName("restoreSnapshot - throws ResourceNotFoundException when snapshot file does not exist")
    void restoreSnapshot_throwsWhenNotFound() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)).thenReturn(true);

        assertThatThrownBy(() -> service.restoreSnapshot("non_existent_snapshot"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Snapshot file not found");
    }

    @Test
    @DisplayName("deleteSnapshot - deletes snapshot archive and companion metadata file")
    void deleteSnapshot_removesFiles() throws IOException {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)).thenReturn(true);

        String snapshotId = "openbar_pre_update_0.8.0_20261010_100000";
        Path sqlPath = backupDir.resolve(snapshotId + ".sql.gz");
        Path metaPath = backupDir.resolve(snapshotId + ".meta.json");

        Files.writeString(sqlPath, "backup-data");
        Files.writeString(metaPath, "{\"fromVersion\":\"0.8.0\"}");

        assertThat(Files.exists(sqlPath)).isTrue();
        assertThat(Files.exists(metaPath)).isTrue();

        service.deleteSnapshot(snapshotId);

        assertThat(Files.exists(sqlPath)).isFalse();
        assertThat(Files.exists(metaPath)).isFalse();
    }
}
