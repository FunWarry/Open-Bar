package com.bar.gestioncocktail.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Data Transfer Object representing the live execution status of an OTA system update.
 *
 * @param status          High-level state: IDLE, RUNNING, SUCCESS, FAILED_ROLLED_BACK
 * @param step            Current step: IDLE, PREFLIGHT, DATABASE_SNAPSHOT, DOCKER_PULL, CONTAINER_RESTART, HEALTHCHECK, COMPLETED, ROLLBACK, FAILED
 * @param progressPercent Integer progress estimation between 0 and 100
 * @param message         Human-readable description of current activity
 * @param currentVersion  Version before the update
 * @param targetVersion   Target version being deployed
 * @param channel         Release channel used
 * @param snapshotId      Identifier of the pre-update backup snapshot
 * @param startedAt       Update initiation timestamp
 * @param completedAt     Update completion timestamp (null if still in progress)
 * @param error           Diagnostic error report if update failed
 * @param logs            Recent log snippets for administrator diagnostics
 */
public record SystemUpdateStatusDTO(
        String status,
        String step,
        int progressPercent,
        String message,
        String currentVersion,
        String targetVersion,
        UpdateChannel channel,
        String snapshotId,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        String error,
        List<String> logs
) {
    /**
     * Factory method creating an idle status.
     *
     * @param currentVersion Currently installed version
     * @return Idle status DTO
     */
    public static SystemUpdateStatusDTO idle(String currentVersion) {
        return new SystemUpdateStatusDTO(
                "IDLE",
                "IDLE",
                0,
                "Système prêt.",
                currentVersion,
                null,
                UpdateChannel.STABLE,
                null,
                null,
                null,
                null,
                List.of()
        );
    }
}
