package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.RecipeStepActionType;
import com.bar.gestioncocktail.model.RecipeStepTemplate;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for creating or updating a reusable preparation step template.
 *
 * @param name Action title
 * @param actionType Category of mixology technique
 * @param defaultDurationSeconds Estimated duration in seconds
 * @param icon Icon identifier
 * @param description Detailed instructions
 * @param isPredefined Built-in flag
 */
@Schema(description = "Request DTO for creating or updating a recipe step template")
public record RecipeStepTemplateRequestDTO(
    @NotBlank(message = "Template name is required")
    @Size(max = 100, message = "Name cannot exceed 100 characters")
    String name,

    @NotNull(message = "Action type is required")
    RecipeStepActionType actionType,

    Integer defaultDurationSeconds,

    @Size(max = 50, message = "Icon cannot exceed 50 characters")
    String icon,

    String description,

    boolean isPredefined
) {
    /**
     * Converts this DTO into a {@link RecipeStepTemplate} entity.
     *
     * @return New template entity instance
     */
    public RecipeStepTemplate toEntity() {
        RecipeStepTemplate t = new RecipeStepTemplate();
        t.setName(name);
        t.setActionType(actionType);
        t.setDefaultDurationSeconds(defaultDurationSeconds != null ? defaultDurationSeconds : 0);
        t.setIcon(icon);
        t.setDescription(description);
        t.setPredefined(isPredefined);
        return t;
    }
}
