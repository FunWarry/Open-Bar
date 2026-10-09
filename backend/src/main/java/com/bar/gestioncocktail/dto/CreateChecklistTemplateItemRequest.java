package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ChecklistMediaType;
import com.bar.gestioncocktail.model.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request payload for creating a task step inside a checklist template.
 *
 * @param title                 Task step title
 * @param description           Detailed instruction
 * @param isMandatory           Whether this task is mandatory
 * @param orderIndex            Display ordering index
 * @param targetRole            Specific role assigned or targeted
 * @param assignedRoles         List of roles permitted or assigned
 * @param assignedUserIds       List of specific staff user IDs assigned
 * @param assignedUsernames     List of specific staff usernames assigned
 * @param mediaType             Media attachment type
 * @param mediaUrl              Path to uploaded media
 * @param videoEmbedUrl         External video embed URL
 * @param mediaAttachmentsJson  JSON array string representing multiple media items
 * @param stepsJson             JSON array string representing structured procedural steps
 */
public record CreateChecklistTemplateItemRequest(
        @NotBlank(message = "Task title is required")
        @Size(max = 200, message = "Task title cannot exceed 200 characters")
        String title,

        String description,
        Boolean isMandatory,
        Integer orderIndex,
        UserRole targetRole,
        List<String> assignedRoles,
        List<Long> assignedUserIds,
        List<String> assignedUsernames,
        ChecklistMediaType mediaType,
        String mediaUrl,
        String videoEmbedUrl,
        String mediaAttachmentsJson,
        String stepsJson
) {
    /**
     * Backward-compatible convenience constructor.
     */
    public CreateChecklistTemplateItemRequest(
            String title,
            String description,
            Boolean isMandatory,
            Integer orderIndex,
            UserRole targetRole,
            ChecklistMediaType mediaType,
            String mediaUrl,
            String videoEmbedUrl
    ) {
        this(title, description, isMandatory, orderIndex, targetRole, null, null, null, mediaType, mediaUrl, videoEmbedUrl, null, null);
    }
}
