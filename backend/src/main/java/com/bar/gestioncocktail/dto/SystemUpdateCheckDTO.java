package com.bar.gestioncocktail.dto;

import java.time.LocalDateTime;

/**
 * Data Transfer Object representing release discovery status and available update metadata.
 *
 * @param hasUpdate       Whether a newer version is available
 * @param currentVersion  The currently running system version
 * @param latestVersion   The latest release version available
 * @param channel         The update channel queried (STABLE or BETA)
 * @param releaseTitle    Title of the release
 * @param releaseNotes    Markdown/HTML release notes and changelog
 * @param publishedAt     Publication timestamp of the release
 * @param downloadUrl     Release page URL on GitHub
 * @param isOffline       True if release lookup failed due to network unavailability
 * @param statusMessage   Diagnostic message for administrative display
 */
public record SystemUpdateCheckDTO(
        boolean hasUpdate,
        String currentVersion,
        String latestVersion,
        UpdateChannel channel,
        String releaseTitle,
        String releaseNotes,
        LocalDateTime publishedAt,
        String downloadUrl,
        boolean isOffline,
        String statusMessage
) {}
