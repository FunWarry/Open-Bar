package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Request payload to initiate an Over-The-Air system software update.
 *
 * @param targetVersion Specific target version tag or null/empty for latest release
 * @param channel       Target channel (STABLE or BETA)
 */
public record SystemUpdateRequest(
        String targetVersion,
        @NotNull(message = "Update channel is required")
        UpdateChannel channel
) {}
