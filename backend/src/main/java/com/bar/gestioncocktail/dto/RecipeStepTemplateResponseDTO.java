package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.RecipeStepActionType;
import com.bar.gestioncocktail.model.RecipeStepTemplate;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Response DTO describing a reusable mixology action template.
 *
 * @param id Unique template identifier
 * @param name Display title of the action
 * @param actionType Action category
 * @param defaultDurationSeconds Standard estimated preparation duration in seconds
 * @param icon Material / Ionic icon identifier
 * @param description Detailed technique instructions
 * @param isPredefined Indicates whether the action is a built-in standard mixology step
 * @param createdAt Creation timestamp
 * @param updatedAt Modification timestamp
 */
@Schema(description = "DTO representation of a reusable preparation action template")
public record RecipeStepTemplateResponseDTO(
    Long id,
    String name,
    RecipeStepActionType actionType,
    Integer defaultDurationSeconds,
    String icon,
    String description,
    boolean isPredefined,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    /**
     * Converts a {@link RecipeStepTemplate} entity into a response DTO.
     *
     * @param t Source template entity
     * @return Corresponding response DTO
     */
    public static RecipeStepTemplateResponseDTO from(RecipeStepTemplate t) {
        if (t == null) return null;
        return new RecipeStepTemplateResponseDTO(
            t.getId(),
            t.getName(),
            t.getActionType(),
            t.getDefaultDurationSeconds(),
            t.getIcon(),
            t.getDescription(),
            t.isPredefined(),
            t.getCreatedAt(),
            t.getUpdatedAt()
        );
    }
}
