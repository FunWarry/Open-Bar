package com.bar.gestioncocktail.dto;

import java.time.LocalDateTime;

/**
 * Data Transfer Object representing an archived pre-update database and container snapshot.
 *
 * @param snapshotId    Unique identifier of the snapshot
 * @param filename      Compressed SQL dump filename
 * @param sizeBytes     Size of the dump archive in bytes
 * @param createdAt     Snapshot creation timestamp
 * @param fromVersion   System version at the time the snapshot was captured
 * @param targetVersion Target version that was attempted
 * @param status        Status of the snapshot (VALID, RESTORED, ARCHIVED)
 */
public record SystemSnapshotDTO(
        String snapshotId,
        String filename,
        long sizeBytes,
        LocalDateTime createdAt,
        String fromVersion,
        String targetVersion,
        String status
) {}
