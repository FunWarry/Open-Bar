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
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        objectMapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
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

    @Test
    @DisplayName("getUpdateStatus - returns IDLE status when status file does not exist")
    void getUpdateStatus_returnsIdleWhenFileMissing() {
        SystemUpdateStatusDTO status = service.getUpdateStatus();

        assertThat(status).isNotNull();
        assertThat(status.status()).isEqualTo("IDLE");
        assertThat(status.step()).isEqualTo("NONE");
        assertThat(status.progressPercent()).isZero();
    }

    @Test
    @DisplayName("getUpdateStatus - reads and parses JSON status file when present")
    void getUpdateStatus_readsJsonStatusFile() throws IOException {
        SystemUpdateStatusDTO mockStatus = new SystemUpdateStatusDTO(
                "RUNNING",
                "DOCKER_PULL",
                50,
                "Pulling container images...",
                "0.8.0",
                "0.8.1",
                UpdateChannel.STABLE,
                "snap_123",
                null,
                null,
                null,
                List.of("log line 1", "log line 2")
        );
        Files.writeString(statusFile, objectMapper.writeValueAsString(mockStatus));

        SystemUpdateStatusDTO status = service.getUpdateStatus();

        assertThat(status).isNotNull();
        assertThat(status.status()).isEqualTo("RUNNING");
        assertThat(status.step()).isEqualTo("DOCKER_PULL");
        assertThat(status.progressPercent()).isEqualTo(50);
        assertThat(status.logs()).hasSize(2);
    }

    @Test
    @DisplayName("getUpdateStatus - falls back to UNKNOWN status when status file is corrupt")
    void getUpdateStatus_fallsBackWhenFileCorrupt() throws IOException {
        Files.writeString(statusFile, "{ corrupted json ");

        SystemUpdateStatusDTO status = service.getUpdateStatus();

        assertThat(status).isNotNull();
        assertThat(status.status()).isEqualTo("IDLE");
        assertThat(status.step()).isEqualTo("UNKNOWN");
    }

    @Test
    @DisplayName("triggerUpdate - initiates update and writes initial status file when preconditions met")
    void triggerUpdate_initiatesUpdateSuccessfully() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)).thenReturn(true);
        when(tableRepository.findByOccupee(true)).thenReturn(Collections.emptyList());
        when(commandeRepository.countByStatutIn(any())).thenReturn(0L);

        SystemUpdateRequest request = new SystemUpdateRequest("0.8.1", UpdateChannel.STABLE);

        SystemUpdateStatusDTO status = service.triggerUpdate(request);

        assertThat(status).isNotNull();
        assertThat(status.status()).isEqualTo("RUNNING");
        assertThat(status.step()).isEqualTo("PREFLIGHT");
        assertThat(status.targetVersion()).isEqualTo("0.8.1");
        assertThat(Files.exists(statusFile)).isTrue();
    }

    @Test
    @DisplayName("triggerUpdate - auto-resolves latest version when targetVersion is blank")
    void triggerUpdate_resolvesLatestVersionWhenBlank() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)).thenReturn(true);
        when(tableRepository.findByOccupee(true)).thenReturn(Collections.emptyList());
        when(commandeRepository.countByStatutIn(any())).thenReturn(0L);

        SystemUpdateRequest request = new SystemUpdateRequest("", UpdateChannel.STABLE);

        SystemUpdateStatusDTO status = service.triggerUpdate(request);

        assertThat(status).isNotNull();
        assertThat(status.status()).isEqualTo("RUNNING");
    }

    @Test
    @DisplayName("restoreSnapshot - throws BusinessException when snapshotId is invalid")
    void restoreSnapshot_throwsWhenInvalidId() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)).thenReturn(true);

        assertThatThrownBy(() -> service.restoreSnapshot("../illegal-path"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Invalid snapshot identifier");
    }

    @Test
    @DisplayName("restoreSnapshot - initiates restore when snapshot file exists")
    void restoreSnapshot_initiatesRestoreWhenFileExists() throws IOException {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)).thenReturn(true);

        String snapshotId = "openbar_pre_update_0.8.0_20261010_120000";
        Files.writeString(backupDir.resolve(snapshotId + ".sql.gz"), "backup-content");

        var result = service.restoreSnapshot(snapshotId);

        assertThat(result).isNotNull();
        assertThat(result.get("snapshotId")).isEqualTo(snapshotId);
    }

    @Test
    @DisplayName("restoreSnapshot - throws BusinessException when module disabled")
    void restoreSnapshot_throwsWhenModuleDisabled() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)).thenReturn(false);

        assertThatThrownBy(() -> service.restoreSnapshot("snap_1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("System Updates module is disabled");
    }

    @Test
    @DisplayName("deleteSnapshot - throws BusinessException when snapshotId is invalid")
    void deleteSnapshot_throwsWhenInvalidId() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)).thenReturn(true);

        assertThatThrownBy(() -> service.deleteSnapshot("invalid id with spaces!"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Invalid snapshot identifier");
    }

    @Test
    @DisplayName("deleteSnapshot - throws BusinessException when module disabled")
    void deleteSnapshot_throwsWhenModuleDisabled() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)).thenReturn(false);

        assertThatThrownBy(() -> service.deleteSnapshot("snap_1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("System Updates module is disabled");
    }

    @Test
    @DisplayName("listSnapshots - returns empty list when backup directory does not exist")
    void listSnapshots_returnsEmptyWhenDirMissing() {
        SystemUpdateService missingDirService = new SystemUpdateService(
                establishmentConfigService,
                tableRepository,
                commandeRepository,
                objectMapper,
                "0.8.0",
                "scripts/ota-update.sh",
                "scripts/ota-update.ps1",
                tempDir.resolve("non_existent_backups").toString(),
                statusFile.toString()
        );

        List<SystemSnapshotDTO> snapshots = missingDirService.listSnapshots();
        assertThat(snapshots).isEmpty();
    }

    @Test
    @DisplayName("getPreFlightCheck - recovers gracefully when repository query throws exception")
    void getPreFlightCheck_handlesRepositoryExceptionGracefully() {
        when(tableRepository.findByOccupee(true)).thenThrow(new RuntimeException("DB Connection timeout"));
        when(commandeRepository.countByStatutIn(any())).thenThrow(new RuntimeException("DB Connection timeout"));

        SystemPreFlightDTO preflight = service.getPreFlightCheck();

        assertThat(preflight).isNotNull();
        assertThat(preflight.occupiedTablesCount()).isZero();
        assertThat(preflight.activeOrdersCount()).isZero();
    }
}
