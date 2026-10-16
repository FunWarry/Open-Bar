package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ChecklistCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request payload for creating a new operational checklist template.
 *
 * @param title                    Template title
 * @param description              Template purpose or context
 * @param category                 Operational category
 * @param estimatedDurationMinutes Estimated execution time in minutes
 * @param icon                     Icon identifier
 * @param color                    Accent color token
 * @param items                    Initial list of template tasks
 */
public record CreateChecklistTemplateRequest(
        @NotBlank(message = "Template title is required")
        @Size(max = 150, message = "Template title cannot exceed 150 characters")
        String title,

        String description,

        @NotNull(message = "Category is required")
        ChecklistCategory category,

        Integer estimatedDurationMinutes,
        String icon,
        String color,

        @Valid
        List<CreateChecklistTemplateItemRequest> items
) {
}
