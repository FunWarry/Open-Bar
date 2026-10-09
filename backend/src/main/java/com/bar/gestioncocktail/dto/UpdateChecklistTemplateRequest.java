package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ChecklistCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request payload for modifying an existing checklist template.
 *
 * @param title                    Optional updated title
 * @param description              Optional updated description
 * @param category                 Optional updated category
 * @param estimatedDurationMinutes Optional updated duration
 * @param icon                     Optional updated icon
 * @param color                    Optional updated accent color
 * @param isActive                 Optional active status
 * @param items                    Optional full updated list of template steps
 */
public record UpdateChecklistTemplateRequest(
        @Size(max = 150, message = "Template title cannot exceed 150 characters")
        String title,

        String description,
        ChecklistCategory category,
        Integer estimatedDurationMinutes,
        String icon,
        String color,
        Boolean isActive,

        @Valid
        List<CreateChecklistTemplateItemRequest> items
) {
}
