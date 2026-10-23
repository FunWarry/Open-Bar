package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.SafetyAlertType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request payload for creating a silent Angel Shot emergency assistance alert from a table QR code.
 *
 * @param type Specific Angel Shot code requested (ANGEL_SHOT_NEAT, ANGEL_SHOT_ICE, ANGEL_SHOT_LIME)
 * @param comment Optional confidential comment or details provided by the patron
 */
public record SafetyAlertRequestDTO(
        @NotNull(message = "Safety alert type is required")
        SafetyAlertType type,

        @Size(max = 255, message = "Comment must not exceed 255 characters")
        String comment
) {
    public SafetyAlertRequestDTO() {
        this(SafetyAlertType.ANGEL_SHOT_NEAT, null);
    }
}
