package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ChecklistMediaType;
import com.bar.gestioncocktail.model.ChecklistTemplateItem;
import com.bar.gestioncocktail.model.UserRole;

import java.util.Collections;
import java.util.List;

/**
 * Data Transfer Object representing an item or step within a checklist template.
 *
 * @param id                    Unique item identifier
 * @param templateId            Parent template identifier
 * @param title                 Task title
 * @param description           Detailed SOP instruction
 * @param isMandatory           Whether completing this task is required
 * @param orderIndex            Sequence position
 * @param targetRole            Role targeted by this task (nullable)
 * @param assignedRoles         List of roles permitted or assigned
 * @param assignedUserIds       List of specific staff user IDs assigned
 * @param assignedUsernames     List of specific staff usernames assigned
 * @param mediaType             Media guide type (IMAGE, VIDEO, EXTERNAL_LINK, NONE)
 * @param mediaUrl              URL or path to media attachment
 * @param videoEmbedUrl         External video embed URL
 * @param mediaAttachmentsJson  JSON array string representing multiple media items
 * @param stepsJson             JSON array string representing structured procedural steps
 */
public record ChecklistTemplateItemDTO(
        Long id,
        Long templateId,
        String title,
        String description,
        boolean isMandatory,
        int orderIndex,
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
    public ChecklistTemplateItemDTO(
            Long id,
            Long templateId,
            String title,
            String description,
            boolean isMandatory,
            int orderIndex,
            UserRole targetRole,
            ChecklistMediaType mediaType,
            String mediaUrl,
            String videoEmbedUrl
    ) {
        this(id, templateId, title, description, isMandatory, orderIndex, targetRole,
                targetRole != null ? List.of(targetRole.name()) : List.of(),
                List.of(), List.of(), mediaType, mediaUrl, videoEmbedUrl, null, null);
    }

    /**
     * Converts a JPA entity into its DTO representation.
     *
     * @param item Source entity
     * @return Transformed DTO
     */
    public static ChecklistTemplateItemDTO from(ChecklistTemplateItem item) {
        if (item == null) {
            return null;
        }

        List<String> roles = parseCommaSeparatedList(item.getAssignedRoles());
        if (roles.isEmpty() && item.getTargetRole() != null) {
            roles = List.of(item.getTargetRole().name());
        }

        List<Long> userIds = parseCommaSeparatedLongList(item.getAssignedUserIds());
        List<String> usernames = parseCommaSeparatedList(item.getAssignedUsernames());

        return new ChecklistTemplateItemDTO(
                item.getId(),
                item.getTemplate() != null ? item.getTemplate().getId() : null,
                item.getTitle(),
                item.getDescription(),
                item.getIsMandatory(),
                item.getOrderIndex(),
                item.getTargetRole(),
                roles,
                userIds,
                usernames,
                item.getMediaType(),
                item.getMediaUrl(),
                item.getVideoEmbedUrl(),
                item.getMediaAttachmentsJson(),
                item.getStepsJson()
        );
    }

    private static List<String> parseCommaSeparatedList(String str) {
        if (str == null || str.trim().isEmpty()) {
            return Collections.emptyList();
        }
        String[] parts = str.split(",");
        List<String> list = new java.util.ArrayList<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                list.add(trimmed);
            }
        }
        return Collections.unmodifiableList(list);
    }

    private static List<Long> parseCommaSeparatedLongList(String str) {
        if (str == null || str.trim().isEmpty()) {
            return Collections.emptyList();
        }
        String[] parts = str.split(",");
        List<Long> list = new java.util.ArrayList<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                try {
                    list.add(Long.parseLong(trimmed));
                } catch (NumberFormatException _) {
                    // Ignore non-numeric token
                }
            }
        }
        return Collections.unmodifiableList(list);
    }
}
