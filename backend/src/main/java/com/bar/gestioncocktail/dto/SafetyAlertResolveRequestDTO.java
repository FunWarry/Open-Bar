package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.Size;

/**
 * Request payload for staff acknowledgement and resolution of an active safety alert.
 *
 * @param resolvedBy Optional staff username or operator name resolving the emergency alert
 */
public record SafetyAlertResolveRequestDTO(
        @Size(max = 100, message = "Resolved by identifier must not exceed 100 characters")
        String resolvedBy
) {
    public SafetyAlertResolveRequestDTO() {
        this(null);
    }
}
