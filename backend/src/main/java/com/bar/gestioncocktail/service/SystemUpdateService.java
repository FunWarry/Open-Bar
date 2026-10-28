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
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Service managing Over-The-Air (OTA) system updates, release discovery via GitHub API,
 * pre-flight environment checks, pre-update database snapshots, and automated rollback orchestration.
 */
@Service
public class SystemUpdateService {

    private static final Logger log = LoggerFactory.getLogger(SystemUpdateService.class);
    private static final long MIN_DISK_SPACE_BYTES = 1024L * 1024L * 1024L; // 1 GB
    private static final String GITHUB_RELEASES_API = "https://api.github.com/repos/FunWarry/Open-Bar/releases";
    private static final String OS_NAME_PROP = "os.name";
    private static final String SQL_GZ_EXT = ".sql.gz";
    private static final String PS_FLAG_FILE = "-File";
    private static final ZoneId DEFAULT_ZONE = ZoneId.systemDefault();

    private final EstablishmentConfigService establishmentConfigService;
    private final TableRepository tableRepository;
    private final CommandeRepository commandeRepository;
    private final ObjectMapper objectMapper;
    private final String currentVersion;
    private final String otaScriptSh;
    private final String otaScriptPs1;
    private final String backupDir;
    private final String statusFilePath;

    /**
     * Constructs SystemUpdateService with dependencies and configured environment properties.
     *
     * @param establishmentConfigService Service for establishment capability verification
     * @param tableRepository            Repository for active table counts
     * @param commandeRepository         Repository for pending order counts
     * @param objectMapper               Jackson JSON mapper
     * @param currentVersion             Current OpenBar system version
     * @param otaScriptSh                Path to Linux bash update orchestrator
     * @param otaScriptPs1               Path to Windows PowerShell update orchestrator
     * @param backupDir                  Directory where backup snapshots are stored
     * @param statusFilePath             Path to the shared JSON status file
     */
    public SystemUpdateService(
            EstablishmentConfigService establishmentConfigService,
            TableRepository tableRepository,
            CommandeRepository commandeRepository,
            ObjectMapper objectMapper,
            @Value("${openbar.version:0.8.0}") String currentVersion,
            @Value("${openbar.system.ota-script-sh:scripts/ota-update.sh}") String otaScriptSh,
            @Value("${openbar.system.ota-script-ps1:scripts/ota-update.ps1}") String otaScriptPs1,
            @Value("${openbar.system.backup-dir:backups}") String backupDir,
            @Value("${openbar.system.status-file:backups/update-status.json}") String statusFilePath) {
        this.establishmentConfigService = establishmentConfigService;
        this.tableRepository = tableRepository;
        this.commandeRepository = commandeRepository;
        this.objectMapper = objectMapper;
        this.currentVersion = currentVersion;
        this.otaScriptSh = otaScriptSh;
        this.otaScriptPs1 = otaScriptPs1;
        this.backupDir = backupDir;
        this.statusFilePath = statusFilePath;
    }

    /**
     * Retrieves current system version and host platform details.
     *
     * @return SystemVersionDTO carrying version, JVM, OS, uptime, and disk usage
     */
    public SystemVersionDTO getSystemVersionInfo() {
        File root = new File(".");
        long freeBytes = root.getUsableSpace();
        long totalBytes = root.getTotalSpace();
        long uptimeSeconds = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;
        String osName = System.getProperty(OS_NAME_PROP, "unknown") + " (" + System.getProperty("os.arch", "unknown") + ")";
        String javaVersion = System.getProperty("java.version", "22");

        return new SystemVersionDTO(
                this.currentVersion,
                javaVersion,
                osName,
                uptimeSeconds,
                freeBytes,
                totalBytes
        );
    }

    /**
     * Checks GitHub Releases API for software updates on the requested channel.
     *
     * @param channel Desired release channel (STABLE or BETA)
     * @return SystemUpdateCheckDTO with release notes, publication date, and availability status
     */
    public SystemUpdateCheckDTO checkForUpdates(UpdateChannel channel) {
        UpdateChannel effectiveChannel = channel != null ? channel : UpdateChannel.STABLE;
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(4))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GITHUB_RELEASES_API))
                    .header("Accept", "application/vnd.github.v3+json")
                    .header("User-Agent", "OpenBar-Server/" + this.currentVersion)
                    .timeout(Duration.ofSeconds(6))
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode releases = objectMapper.readTree(response.body());
                Optional<JsonNode> matchingRelease = findMatchingRelease(releases, effectiveChannel);
                if (matchingRelease.isPresent()) {
                    return toUpdateCheckDTO(matchingRelease.get(), effectiveChannel);
                }
            }

            return createNoUpdateCheck(effectiveChannel);

        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.info("Update check interrupted: {}", ex.getMessage());
            return createOfflineFallbackCheck(effectiveChannel);
        } catch (Exception ex) {
            log.info("Offline or unreachable update server: {}", ex.getMessage());
            return createOfflineFallbackCheck(effectiveChannel);
        }
    }

    Optional<JsonNode> findMatchingRelease(JsonNode releases, UpdateChannel channel) {
        if (releases == null || !releases.isArray() || releases.isEmpty()) {
            return Optional.empty();
        }
        for (JsonNode release : releases) {
            boolean isDraft = release.path("draft").asBoolean(false);
            boolean isPrerelease = release.path("prerelease").asBoolean(false);
            boolean isExcluded = isDraft || (channel == UpdateChannel.STABLE && isPrerelease);
            if (!isExcluded) {
                return Optional.of(release);
            }
        }
        return Optional.empty();
    }

    SystemUpdateCheckDTO toUpdateCheckDTO(JsonNode release, UpdateChannel channel) {
        String tagName = release.path("tag_name").asText("");
        String cleanTargetVersion = cleanVersion(tagName);
        String cleanCurrent = cleanVersion(this.currentVersion);
        boolean hasUpdate = isNewerVersion(cleanTargetVersion, cleanCurrent);

        String title = release.path("name").asText(tagName);
        String notes = release.path("body").asText("");
        String publishedAtStr = release.path("published_at").asText();
        LocalDateTime publishedAt = parseDateTime(publishedAtStr);
        String htmlUrl = release.path("html_url").asText();

        String message = hasUpdate
                ? "Nouvelle version " + cleanTargetVersion + " disponible (" + channel + ")."
                : "Votre système est à jour (" + this.currentVersion + ").";

        return new SystemUpdateCheckDTO(
                hasUpdate,
                this.currentVersion,
                cleanTargetVersion,
                channel,
                title,
                notes,
                publishedAt,
                htmlUrl,
                false,
                message
        );
    }

    SystemUpdateCheckDTO createNoUpdateCheck(UpdateChannel channel) {
        return new SystemUpdateCheckDTO(
                false,
                this.currentVersion,
                this.currentVersion,
                channel,
                null,
                null,
                null,
                null,
                false,
                "Aucune nouvelle version trouvée pour le canal " + channel
        );
    }

    SystemUpdateCheckDTO createOfflineFallbackCheck(UpdateChannel channel) {
        return new SystemUpdateCheckDTO(
                false,
                this.currentVersion,
                this.currentVersion,
                channel,
                null,
                null,
                null,
                null,
                true,
                "Système hors-ligne / Pas de connexion Internet détectée."
        );
    }

    /**
     * Executes pre-flight safety checks (disk space, occupied tables, and active orders).
     *
     * @return SystemPreFlightDTO describing safety conditions and non-blocking warnings
     */
    public SystemPreFlightDTO getPreFlightCheck() {
        File root = new File(".");
        long freeBytes = root.getUsableSpace();
        boolean diskOk = freeBytes >= MIN_DISK_SPACE_BYTES;

        long occupiedTables = 0;
        try {
            occupiedTables = tableRepository.findByOccupee(true).size();
        } catch (Exception ex) {
            log.warn("Failed to query occupied tables: {}", ex.getMessage());
        }

        long activeOrders = 0;
        try {
            activeOrders = commandeRepository.countByStatutIn(List.of(
                    CommandeStatut.EN_ATTENTE,
                    CommandeStatut.EN_PREPARATION,
                    CommandeStatut.PRET
            ));
        } catch (Exception ex) {
            log.warn("Failed to query active orders: {}", ex.getMessage());
        }

        List<String> warnings = new ArrayList<>();
        if (!diskOk) {
            warnings.add("Espace disque critique: moins de 1 Go disponible (" + (freeBytes / (1024 * 1024)) + " Mo).");
        }
        if (occupiedTables > 0) {
            warnings.add(occupiedTables + " table(s) sont actuellement occupées.");
        }
        if (activeOrders > 0) {
            warnings.add(activeOrders + " commande(s) sont en cours de préparation ou de service.");
        }

        return new SystemPreFlightDTO(
                diskOk,
                freeBytes,
                MIN_DISK_SPACE_BYTES,
                diskOk,
                occupiedTables,
                activeOrders,
                warnings
        );
    }

    /**
     * Reads the current update status from the shared JSON status file.
     *
     * @return SystemUpdateStatusDTO with step, progress, and logs
     */
    public SystemUpdateStatusDTO getUpdateStatus() {
        Path path = Paths.get(this.statusFilePath);
        if (!Files.exists(path)) {
            return new SystemUpdateStatusDTO(
                    "IDLE",
                    "NONE",
                    0,
                    "Aucune mise à jour en cours.",
                    this.currentVersion,
                    null,
                    UpdateChannel.STABLE,
                    null,
                    null,
                    null,
                    null,
                    Collections.emptyList()
            );
        }

        try {
            String content = Files.readString(path);
            return objectMapper.readValue(content, SystemUpdateStatusDTO.class);
        } catch (Exception ex) {
            log.error("Failed to read update status file {}: {}", path, ex.getMessage());
            return new SystemUpdateStatusDTO(
                    "IDLE",
                    "UNKNOWN",
                    0,
                    "Statut indéterminé.",
                    this.currentVersion,
                    null,
                    UpdateChannel.STABLE,
                    null,
                    null,
                    null,
                    null,
                    Collections.emptyList()
            );
        }
    }

    /**
     * Initiates the over-the-air update process by verifying pre-flight conditions,
     * writing initial status, and spawning the detached host orchestrator script.
     *
     * @param request SystemUpdateRequest containing target version and channel
     * @return Initial SystemUpdateStatusDTO
     */
    public SystemUpdateStatusDTO triggerUpdate(SystemUpdateRequest request) {
        verifyModuleEnabled();

        SystemPreFlightDTO preFlight = getPreFlightCheck();
        if (!preFlight.canProceed()) {
            throw new BusinessException("Pre-flight validation failed: Insufficient disk space.");
        }

        String targetVer = request.targetVersion();
        if (targetVer == null || targetVer.isBlank()) {
            SystemUpdateCheckDTO check = checkForUpdates(request.channel());
            targetVer = check.latestVersion();
        }
        if (targetVer == null || !targetVer.matches("^[vV]?\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9._-]+)?$")) {
            throw new BusinessException("Invalid target version format: " + sanitizeForLog(targetVer));
        }

        String timestamp = LocalDateTime.now(DEFAULT_ZONE).format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String snapshotId = "openbar_pre_update_" + cleanVersion(this.currentVersion) + "_" + timestamp;

        // Initialize status file
        SystemUpdateStatusDTO initialStatus = new SystemUpdateStatusDTO(
                "RUNNING",
                "PREFLIGHT",
                10,
                "Initialisation de l'orchestration de mise à jour vers " + targetVer + "...",
                this.currentVersion,
                targetVer,
                request.channel(),
                snapshotId,
                LocalDateTime.now(DEFAULT_ZONE),
                null,
                null,
                List.of("[" + timestamp + "] Initialisation du processus de mise à jour...")
        );

        writeStatusToFile(initialStatus);

        // Launch orchestrator asynchronously
        final String finalTargetVersion = targetVer;
        final UpdateChannel finalChannel = request.channel();
        CompletableFuture.runAsync(() -> executeOrchestrator(finalTargetVersion, finalChannel, snapshotId));

        return initialStatus;
    }

    /**
     * Lists pre-update database snapshots archived in the backup directory.
     *
     * @return List of SystemSnapshotDTO sorted newest first
     */
    public List<SystemSnapshotDTO> listSnapshots() {
        Path dir = Paths.get(this.backupDir);
        if (!Files.exists(dir)) {
            return Collections.emptyList();
        }

        List<SystemSnapshotDTO> result = new ArrayList<>();
        try {
            File[] files = dir.toFile().listFiles((_, name) -> name.startsWith("openbar_pre_update_") && name.endsWith(SQL_GZ_EXT));
            if (files != null) {
                for (File file : files) {
                    result.add(parseSnapshotFile(dir, file));
                }
            }
        } catch (Exception ex) {
            log.error("Failed to list snapshots in {}: {}", dir, ex.getMessage());
        }

        result.sort((a, b) -> b.createdAt().compareTo(a.createdAt()));
        return result;
    }

    private SystemSnapshotDTO parseSnapshotFile(Path dir, File file) {
        String filename = file.getName();
        String snapshotId = filename.substring(0, filename.length() - SQL_GZ_EXT.length());
        long sizeBytes = file.length();
        Path metaPath = dir.resolve(snapshotId + ".meta.json");
        SnapshotMetadata meta = readSnapshotMetadata(metaPath);

        return new SystemSnapshotDTO(
                snapshotId,
                filename,
                sizeBytes,
                meta.createdAt(),
                meta.fromVersion(),
                meta.targetVersion(),
                "VALID"
        );
    }

    private record SnapshotMetadata(String fromVersion, String targetVersion, LocalDateTime createdAt) {}

    private SnapshotMetadata readSnapshotMetadata(Path metaPath) {
        String fromVer = this.currentVersion;
        String targetVer = null;
        LocalDateTime createdAt = LocalDateTime.now(DEFAULT_ZONE);

        if (Files.exists(metaPath)) {
            try {
                JsonNode meta = objectMapper.readTree(Files.readString(metaPath));
                fromVer = meta.path("fromVersion").asText(this.currentVersion);
                targetVer = meta.path("targetVersion").asText(null);
                String ts = meta.path("timestamp").asText(null);
                if (ts != null) {
                    createdAt = parseDateTime(ts);
                }
            } catch (Exception _) {
                // fallback to defaults
            }
        }
        return new SnapshotMetadata(fromVer, targetVer, createdAt);
    }

    /**
     * Restores an archived database snapshot and rolls back containers.
     *
     * @param snapshotId Snapshot identifier to restore
     * @return Result message
     */
    public Map<String, String> restoreSnapshot(String snapshotId) {
        verifyModuleEnabled();
        validateSnapshotId(snapshotId);

        Path sqlGzPath = resolveSafeSnapshotPath(snapshotId, SQL_GZ_EXT);
        if (!Files.exists(sqlGzPath) || !Files.isRegularFile(sqlGzPath)) {
            throw new ResourceNotFoundException("Snapshot file not found: " + snapshotId);
        }

        SystemSnapshotDTO matchedSnapshot = listSnapshots().stream()
                .filter(s -> s.snapshotId().equals(snapshotId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Snapshot file not found: " + snapshotId));

        Path baseDir = Paths.get(this.backupDir).toAbsolutePath().normalize();
        Path safeFile = baseDir.resolve(matchedSnapshot.filename()).normalize();
        if (!safeFile.startsWith(baseDir) || !Files.isRegularFile(safeFile)) {
            throw new BusinessException("Invalid snapshot path.");
        }

        String safeSnapshotId = sanitizeForLog(snapshotId);
        log.info("Triggering disaster recovery restore for snapshot: {}", safeSnapshotId);
        CompletableFuture.runAsync(() -> executeRollbackRestore(safeFile.toString()));

        return Map.of(
                "message", "Restauration du snapshot " + safeSnapshotId + " initiée avec succès.",
                "snapshotId", safeSnapshotId
        );
    }

    /**
     * Permanently deletes a backup snapshot and its companion metadata.
     *
     * @param snapshotId Identifier of the snapshot to delete
     */
    public void deleteSnapshot(String snapshotId) {
        verifyModuleEnabled();
        validateSnapshotId(snapshotId);

        Path sqlGzPath = resolveSafeSnapshotPath(snapshotId, SQL_GZ_EXT);
        Path metaPath = resolveSafeSnapshotPath(snapshotId, ".meta.json");

        String safeSnapshotId = sanitizeForLog(snapshotId);
        try {
            Files.deleteIfExists(sqlGzPath);
            Files.deleteIfExists(metaPath);
            log.info("Deleted snapshot: {}", safeSnapshotId);
        } catch (IOException ex) {
            log.error("Failed to delete snapshot files for {}: {}", safeSnapshotId, ex.getMessage());
            throw new BusinessException("Failed to delete snapshot: " + ex.getMessage());
        }
    }

    Path resolveSafeSnapshotPath(String snapshotId, String extension) {
        validateSnapshotId(snapshotId);
        Path baseDir = Paths.get(this.backupDir).toAbsolutePath().normalize();
        Path targetPath = baseDir.resolve(snapshotId + extension).normalize();
        if (!targetPath.startsWith(baseDir) || targetPath.getParent() == null || !targetPath.getParent().equals(baseDir)) {
            throw new BusinessException("Path traversal attempt detected in snapshot identifier.");
        }
        return targetPath;
    }

    void validateSnapshotId(String snapshotId) {
        if (snapshotId == null
                || !snapshotId.matches("^[a-zA-Z0-9_.-]{1,64}$")
                || snapshotId.contains("..") || snapshotId.contains("/") || snapshotId.contains("\\")) {
            throw new BusinessException("Invalid snapshot identifier.");
        }
    }

    static String sanitizeForLog(String input) {
        if (input == null) {
            return "";
        }
        return input.replaceAll("[\\r\\n]", "_");
    }

    private void verifyModuleEnabled() {
        if (!establishmentConfigService.isModuleEnabled(EstablishmentModule.SYSTEM_UPDATES)) {
            throw new BusinessException("System Updates module is disabled for this establishment.");
        }
    }

    private void writeStatusToFile(SystemUpdateStatusDTO status) {
        try {
            Path path = Paths.get(this.statusFilePath);
            Path parent = path.getParent();
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }
            Files.writeString(path, objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(status));
        } catch (Exception ex) {
            log.error("Failed to write update status to file {}: {}", this.statusFilePath, ex.getMessage());
        }
    }

    List<String> buildOrchestratorCommand(String targetVersion, UpdateChannel channel, String snapshotId, boolean isWindows) {
        List<String> command = new ArrayList<>();
        if (isWindows) {
            command.add("powershell.exe");
            command.add("-ExecutionPolicy");
            command.add("Bypass");
            command.add(PS_FLAG_FILE);
            command.add(this.otaScriptPs1);
            command.add("-TargetVersion");
            command.add(targetVersion);
            command.add("-Channel");
            command.add(channel.name());
            command.add("-SnapshotId");
            command.add(snapshotId);
            command.add("-StatusFile");
            command.add(this.statusFilePath);
            command.add("-BackupDir");
            command.add(this.backupDir);
        } else {
            command.add("bash");
            command.add(this.otaScriptSh);
            command.add("--target-version");
            command.add(targetVersion);
            command.add("--channel");
            command.add(channel.name());
            command.add("--snapshot-id");
            command.add(snapshotId);
            command.add("--status-file");
            command.add(this.statusFilePath);
            command.add("--backup-dir");
            command.add(this.backupDir);
        }
        return command;
    }

    private void executeOrchestrator(String targetVersion, UpdateChannel channel, String snapshotId) {
        boolean isWindows = System.getProperty(OS_NAME_PROP, "").toLowerCase().contains("win");
        List<String> command = buildOrchestratorCommand(targetVersion, channel, snapshotId, isWindows);

        try {
            if (log.isInfoEnabled()) {
                log.info("Launching OTA orchestrator: {}", String.join(" ", command));
            }
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            process.waitFor();
            log.info("OTA orchestrator exited with code: {}", process.exitValue());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            handleOrchestratorFailure(targetVersion, channel, snapshotId, ex.getMessage());
        } catch (Exception ex) {
            handleOrchestratorFailure(targetVersion, channel, snapshotId, ex.getMessage());
        }
    }

    void handleOrchestratorFailure(String targetVersion, UpdateChannel channel, String snapshotId, String error) {
        log.error("Execution of OTA update orchestrator failed: {}", error);
        SystemUpdateStatusDTO failedStatus = new SystemUpdateStatusDTO(
                "FAILED_ROLLED_BACK",
                "FAILED",
                100,
                "Échec de l'exécution du script orchestrateur: " + error,
                this.currentVersion,
                targetVersion,
                channel,
                snapshotId,
                LocalDateTime.now(DEFAULT_ZONE),
                LocalDateTime.now(DEFAULT_ZONE),
                error,
                List.of("Erreur: " + error)
        );
        writeStatusToFile(failedStatus);
    }

    void validateRollbackPath(String snapshotFilePath) {
        if (snapshotFilePath == null
                || snapshotFilePath.contains("..")
                || !snapshotFilePath.matches("^[^;&|`$\\r\\n]+\\.sql\\.gz$")) {
            throw new BusinessException("Invalid rollback snapshot file path.");
        }
    }

    List<String> buildRollbackCommand(String snapshotFilePath, boolean isWindows) {
        validateRollbackPath(snapshotFilePath);
        List<String> command = new ArrayList<>();
        if (isWindows) {
            command.add("powershell.exe");
            command.add("-ExecutionPolicy");
            command.add("Bypass");
            command.add(PS_FLAG_FILE);
            command.add("scripts/restore-db.ps1");
            command.add(PS_FLAG_FILE);
            command.add(snapshotFilePath);
            command.add("-Force");
        } else {
            command.add("bash");
            command.add("scripts/restore-db.sh");
            command.add("-f");
            command.add(snapshotFilePath);
            command.add("--yes");
        }
        return command;
    }

    private void executeRollbackRestore(String snapshotFilePath) {
        validateRollbackPath(snapshotFilePath);
        boolean isWindows = System.getProperty(OS_NAME_PROP, "").toLowerCase().contains("win");
        List<String> command = buildRollbackCommand(snapshotFilePath, isWindows);

        try {
            if (log.isInfoEnabled()) {
                log.info("Launching rollback restore: {}", String.join(" ", command));
            }
            ProcessBuilder pb = new ProcessBuilder(command);
            Process process = pb.start();
            process.waitFor();
            log.info("Rollback restore process exited with code: {}", process.exitValue());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.error("Rollback restore interrupted: {}", ex.getMessage());
        } catch (Exception ex) {
            log.error("Failed to execute rollback restore: {}", ex.getMessage());
        }
    }

    static String cleanVersion(String version) {
        if (version == null) return "0.0.0";
        String v = version.trim();
        if (v.startsWith("v") || v.startsWith("V")) {
            v = v.substring(1);
        }
        return v;
    }

    static boolean isNewerVersion(String candidate, String current) {
        try {
            String[] candParts = candidate.split("[-_.]");
            String[] currParts = current.split("[-_.]");
            int len = Math.max(candParts.length, currParts.length);
            for (int i = 0; i < len; i++) {
                int cVal = i < candParts.length ? parseVersionSegment(candParts[i]) : 0;
                int curVal = i < currParts.length ? parseVersionSegment(currParts[i]) : 0;
                if (cVal > curVal) return true;
                if (cVal < curVal) return false;
            }
            return false;
        } catch (Exception _) {
            return !candidate.equalsIgnoreCase(current);
        }
    }

    private static int parseVersionSegment(String segment) {
        try {
            return Integer.parseInt(segment.replaceAll("\\D+", ""));
        } catch (Exception _) {
            return 0;
        }
    }

    static LocalDateTime parseDateTime(String text) {
        if (text == null || text.isBlank()) {
            return LocalDateTime.now(DEFAULT_ZONE);
        }
        try {
            return LocalDateTime.parse(text, DateTimeFormatter.ISO_DATE_TIME);
        } catch (Exception _) {
            return LocalDateTime.now(DEFAULT_ZONE);
        }
    }
}
