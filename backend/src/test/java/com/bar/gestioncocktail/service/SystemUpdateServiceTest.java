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

        assertThat(result).isNotNull().containsEntry("snapshotId", snapshotId);
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

    @Test
    @DisplayName("buildOrchestratorCommand - constructs proper command for Windows and Linux")
    void buildOrchestratorCommand_buildsOsSpecificCommand() {
        List<String> winCmd = service.buildOrchestratorCommand("0.8.1", UpdateChannel.STABLE, "snap_1", true);
        assertThat(winCmd).contains("powershell.exe", "-TargetVersion", "0.8.1", "-Channel", "STABLE");

        List<String> linuxCmd = service.buildOrchestratorCommand("0.8.1", UpdateChannel.BETA, "snap_1", false);
        assertThat(linuxCmd).contains("bash", "--target-version", "0.8.1", "--channel", "BETA");
    }

    @Test
    @DisplayName("buildRollbackCommand - constructs proper restore command for Windows and Linux")
    void buildRollbackCommand_buildsOsSpecificCommand() {
        List<String> winCmd = service.buildRollbackCommand("path/to/snap.sql.gz", true);
        assertThat(winCmd).contains("powershell.exe", "scripts/restore-db.ps1", "path/to/snap.sql.gz");

        List<String> linuxCmd = service.buildRollbackCommand("path/to/snap.sql.gz", false);
        assertThat(linuxCmd).contains("bash", "scripts/restore-db.sh", "path/to/snap.sql.gz");
    }

    @Test
    @DisplayName("handleOrchestratorFailure - writes failed status file with diagnostic details")
    void handleOrchestratorFailure_writesStatusFile() {
        service.handleOrchestratorFailure("0.8.1", UpdateChannel.STABLE, "snap_err", "Connection timed out");

        SystemUpdateStatusDTO status = service.getUpdateStatus();
        assertThat(status.status()).isEqualTo("FAILED_ROLLED_BACK");
        assertThat(status.step()).isEqualTo("FAILED");
        assertThat(status.error()).isEqualTo("Connection timed out");
    }

    @Test
    @DisplayName("sanitizeForLog - strips line breaks and handles null safely")
    void sanitizeForLog_stripsLineBreaks() {
        assertThat(SystemUpdateService.sanitizeForLog(null)).isEmpty();
        assertThat(SystemUpdateService.sanitizeForLog("safe_id-123")).isEqualTo("safe_id-123");
        assertThat(SystemUpdateService.sanitizeForLog("bad\r\nid\n")).isEqualTo("bad__id_");
    }

    @Test
    @DisplayName("cleanVersion - cleans version prefix and handles null")
    void cleanVersion_cleansVersionPrefix() {
        assertThat(SystemUpdateService.cleanVersion(null)).isEqualTo("0.0.0");
        assertThat(SystemUpdateService.cleanVersion("v1.2.3")).isEqualTo("1.2.3");
        assertThat(SystemUpdateService.cleanVersion("V2.0.0-beta")).isEqualTo("2.0.0-beta");
        assertThat(SystemUpdateService.cleanVersion("3.0.0")).isEqualTo("3.0.0");
    }

    @Test
    @DisplayName("isNewerVersion - compares semantic versioning accurately")
    void isNewerVersion_comparesVersions() {
        assertThat(SystemUpdateService.isNewerVersion("0.8.1", "0.8.0")).isTrue();
        assertThat(SystemUpdateService.isNewerVersion("0.8.0", "0.8.1")).isFalse();
        assertThat(SystemUpdateService.isNewerVersion("0.8.0", "0.8.0")).isFalse();
        assertThat(SystemUpdateService.isNewerVersion("1.0.0", "0.9.9")).isTrue();
        assertThat(SystemUpdateService.isNewerVersion("alpha", "beta")).isFalse();
    }

    @Test
    @DisplayName("parseDateTime - parses valid ISO dates and provides fallback")
    void parseDateTime_handlesDatesAndFallbacks() {
        assertThat(SystemUpdateService.parseDateTime(null)).isNotNull();
        assertThat(SystemUpdateService.parseDateTime("   ")).isNotNull();
        assertThat(SystemUpdateService.parseDateTime("invalid-date-format")).isNotNull();
        assertThat(SystemUpdateService.parseDateTime("2026-10-20T12:00:00")).isNotNull();
    }

    @Test
    @DisplayName("findMatchingRelease - filters drafts and channel-specific prereleases")
    void findMatchingRelease_filtersAppropriately() {
        assertThat(service.findMatchingRelease(null, UpdateChannel.STABLE)).isEmpty();
        assertThat(service.findMatchingRelease(objectMapper.createArrayNode(), UpdateChannel.STABLE)).isEmpty();

        var array = objectMapper.createArrayNode();
        var draft = array.addObject();
        draft.put("draft", true);
        draft.put("tag_name", "v0.9.0");

        var prerelease = array.addObject();
        prerelease.put("draft", false);
        prerelease.put("prerelease", true);
        prerelease.put("tag_name", "v0.8.2-rc1");

        var stable = array.addObject();
        stable.put("draft", false);
        stable.put("prerelease", false);
        stable.put("tag_name", "v0.8.1");

        // Stable channel skips draft and prerelease, picks stable
        var stableMatch = service.findMatchingRelease(array, UpdateChannel.STABLE);
        assertThat(stableMatch).isPresent();
        assertThat(stableMatch.get().path("tag_name").asText()).isEqualTo("v0.8.1");

        // Beta channel allows prerelease
        var betaMatch = service.findMatchingRelease(array, UpdateChannel.BETA);
        assertThat(betaMatch).isPresent();
        assertThat(betaMatch.get().path("tag_name").asText()).isEqualTo("v0.8.2-rc1");
    }

    @Test
    @DisplayName("toUpdateCheckDTO - produces complete check DTO from JSON release node")
    void toUpdateCheckDTO_createsCompleteDTO() {
        var release = objectMapper.createObjectNode();
        release.put("tag_name", "v0.8.1");
        release.put("name", "Release 0.8.1");
        release.put("body", "Release notes content");
        release.put("published_at", "2026-10-18T10:00:00");
        release.put("html_url", "https://github.com/FunWarry/Open-Bar/releases/v0.8.1");

        SystemUpdateCheckDTO dto = service.toUpdateCheckDTO(release, UpdateChannel.STABLE);
        assertThat(dto.hasUpdate()).isTrue();
        assertThat(dto.latestVersion()).isEqualTo("0.8.1");
        assertThat(dto.releaseTitle()).isEqualTo("Release 0.8.1");
        assertThat(dto.releaseNotes()).isEqualTo("Release notes content");
    }

    @Test
    @DisplayName("createNoUpdateCheck and createOfflineFallbackCheck - produce expected DTOs")
    void fallbackChecks_produceExpectedDTOs() {
        SystemUpdateCheckDTO noUpdate = service.createNoUpdateCheck(UpdateChannel.STABLE);
        assertThat(noUpdate.hasUpdate()).isFalse();
        assertThat(noUpdate.isOffline()).isFalse();

        SystemUpdateCheckDTO offline = service.createOfflineFallbackCheck(UpdateChannel.BETA);
        assertThat(offline.hasUpdate()).isFalse();
        assertThat(offline.isOffline()).isTrue();
    }

    @Test
    @DisplayName("triggerUpdate - rejects targetVersion with command injection characters")
    void triggerUpdate_rejectsMaliciousTargetVersion() {
        when(establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)).thenReturn(true);
        when(tableRepository.findByOccupee(true)).thenReturn(Collections.emptyList());
        when(commandeRepository.countByStatutIn(any())).thenReturn(0L);

        SystemUpdateRequest maliciousRequest = new SystemUpdateRequest("0.8.1; rm -rf /", UpdateChannel.STABLE);

        assertThatThrownBy(() -> service.triggerUpdate(maliciousRequest))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Invalid target version format");
    }
}
