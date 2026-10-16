package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ChecklistMediaType;
import com.bar.gestioncocktail.model.ChecklistRunItem;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;

import java.time.LocalDateTime;

import java.util.Collections;
import java.util.List;

/**
 * Data Transfer Object representing an executed task within a checklist run.
 * Contains detailed completion timestamp, user attribution, staff notes, and photo proof URL.
 *
 * @param id                    Task run item ID
 * @param runId                 Parent run ID
 * @param templateItemId        Original template item ID (nullable)
 * @param title                 Task title
 * @param description           Task instructions / SOP guide
 * @param isMandatory           Whether completing this task is required
 * @param orderIndex            Display ordering index
 * @param targetRole            Role targeted by this task
 * @param assignedRoles         List of roles permitted or assigned
 * @param assignedUserIds       List of specific staff user IDs assigned
 * @param assignedUsernames     List of specific staff usernames assigned
 * @param mediaType             Media attachment type
 * @param mediaUrl              Guide media URL
 * @param videoEmbedUrl         External video embed URL
 * @param mediaAttachmentsJson  JSON array string representing multiple media items
 * @param stepsJson             JSON array string representing structured procedural steps
 * @param isCompleted           Whether task has been checked off
 * @param completedAt           Completion timestamp
 * @param completedByUserId     User ID who completed the task
 * @param completedByUsername   Username of completing user
 * @param completedByFullName   Full name of completing user
 * @param comment               Staff note or remark
 * @param photoProofUrl         URL of photographic proof
 */
public record ChecklistRunItemDTO(
        Long id,
        Long runId,
        Long templateItemId,
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
        String stepsJson,
        boolean isCompleted,
        LocalDateTime completedAt,
        Long completedByUserId,
        String completedByUsername,
        String completedByFullName,
        String comment,
        String photoProofUrl
) {
    /**
     * Backward-compatible convenience constructor.
     */
    public ChecklistRunItemDTO(
            Long id,
            Long runId,
            Long templateItemId,
            String title,
            String description,
            boolean isMandatory,
            int orderIndex,
            UserRole targetRole,
            ChecklistMediaType mediaType,
            String mediaUrl,
            String videoEmbedUrl,
            boolean isCompleted,
            LocalDateTime completedAt,
            Long completedByUserId,
            String completedByUsername,
            String completedByFullName,
            String comment,
            String photoProofUrl
    ) {
        this(id, runId, templateItemId, title, description, isMandatory, orderIndex, targetRole,
                targetRole != null ? List.of(targetRole.name()) : List.of(),
                List.of(), List.of(), mediaType, mediaUrl, videoEmbedUrl, null, null,
                isCompleted, completedAt, completedByUserId, completedByUsername, completedByFullName, comment, photoProofUrl);
    }

    /**
     * Converts a JPA entity into its DTO representation.
     *
     * @param item Source entity
     * @return Transformed DTO
     */
    public static ChecklistRunItemDTO from(ChecklistRunItem item) {
        if (item == null) {
            return null;
        }
        User user = item.getCompletedBy();
        String fullName = null;
        if (user != null) {
            String prenom = user.getPrenom() != null ? user.getPrenom() : "";
            String nom = user.getNom() != null ? user.getNom() : "";
            fullName = (prenom + " " + nom).trim();
            if (fullName.isEmpty()) {
                fullName = user.getUsername();
            }
        }

        List<String> roles = parseCommaSeparatedList(item.getAssignedRoles());
        if (roles.isEmpty() && item.getTargetRole() != null) {
            roles = List.of(item.getTargetRole().name());
        }

        List<Long> userIds = parseCommaSeparatedLongList(item.getAssignedUserIds());
        List<String> usernames = parseCommaSeparatedList(item.getAssignedUsernames());

        return new ChecklistRunItemDTO(
                item.getId(),
                item.getRun() != null ? item.getRun().getId() : null,
                item.getTemplateItemId(),
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
                item.getStepsJson(),
                item.getIsCompleted(),
                item.getCompletedAt(),
                user != null ? user.getId() : null,
                user != null ? user.getUsername() : null,
                fullName,
                item.getComment(),
                item.getPhotoProofUrl()
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
