package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ChecklistCategory;
import com.bar.gestioncocktail.model.ChecklistTemplate;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Data Transfer Object representing a checklist template.
 *
 * @param id                       Unique identifier
 * @param title                    Template title
 * @param description              General description
 * @param category                 Operational category
 * @param estimatedDurationMinutes Estimated execution duration in minutes
 * @param icon                     Icon identifier
 * @param color                    Accent color token
 * @param isActive                 Whether template is active and ready for runs
 * @param itemsCount               Number of steps/tasks in template
 * @param items                    Detailed list of template task items
 * @param createdAt                Creation timestamp
 * @param updatedAt                Last modification timestamp
 */
public record ChecklistTemplateDTO(
        Long id,
        String title,
        String description,
        ChecklistCategory category,
        int estimatedDurationMinutes,
        String icon,
        String color,
        boolean isActive,
        int itemsCount,
        List<ChecklistTemplateItemDTO> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    /**
     * Converts a JPA entity into its DTO representation.
     *
     * @param template Source entity
     * @return Transformed DTO
     */
    public static ChecklistTemplateDTO from(ChecklistTemplate template) {
        if (template == null) {
            return null;
        }
        List<ChecklistTemplateItemDTO> itemList = template.getItems() != null
                ? template.getItems().stream().map(ChecklistTemplateItemDTO::from).toList()
                : Collections.emptyList();

        return new ChecklistTemplateDTO(
                template.getId(),
                template.getTitle(),
                template.getDescription(),
                template.getCategory(),
                template.getEstimatedDurationMinutes(),
                template.getIcon(),
                template.getColor(),
                template.getIsActive(),
                itemList.size(),
                itemList,
                template.getCreatedAt(),
                template.getUpdatedAt()
        );
    }
}
