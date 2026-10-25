package com.bar.gestioncocktail.dto;

/**
 * Data Transfer Object carrying details about current system version, runtime environment, and storage.
 *
 * @param currentVersion Current OpenBar application version
 * @param javaVersion    Current Java runtime version
 * @param osName         Operating system name and architecture
 * @param uptimeSeconds  Backend process uptime in seconds
 * @param freeDiskBytes  Free disk space in bytes on the application drive
 * @param totalDiskBytes Total disk space in bytes on the application drive
 */
public record SystemVersionDTO(
        String currentVersion,
        String javaVersion,
        String osName,
        long uptimeSeconds,
        long freeDiskBytes,
        long totalDiskBytes
) {}
