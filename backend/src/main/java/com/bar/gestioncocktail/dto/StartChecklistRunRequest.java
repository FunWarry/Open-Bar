package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Request payload to initiate a new execution run session from an existing template.
 *
 * @param templateId Identifier of the source checklist template
 * @param notes      Optional initial notes for the shift/session
 */
public record StartChecklistRunRequest(
        @NotNull(message = "Template ID is required")
        Long templateId,

        String notes
) {
}
