package com.bar.gestioncocktail.dto;

import java.util.List;

/**
 * Data Transfer Object carrying pre-flight check validation metrics before initiating an update.
 *
 * @param canProceed          Whether the update can be safely initiated
 * @param freeDiskBytes       Available disk space in bytes
 * @param requiredDiskBytes   Minimum required disk space in bytes (1 GB)
 * @param hasSufficientDisk   Whether disk space requirement is satisfied
 * @param occupiedTablesCount Number of currently occupied tables
 * @param activeOrdersCount   Number of orders currently in preparation or pending
 * @param warnings            List of warning messages for the administrator
 */
public record SystemPreFlightDTO(
        boolean canProceed,
        long freeDiskBytes,
        long requiredDiskBytes,
        boolean hasSufficientDisk,
        long occupiedTablesCount,
        long activeOrdersCount,
        List<String> warnings
) {}
