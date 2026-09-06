package com.bar.gestioncocktail.dto;
/**
 * Response DTO indicating whether the initial establishment administrator setup is complete.
 */

public record SetupStatusDTO(
    boolean initialized,
    long userCount
) {}
