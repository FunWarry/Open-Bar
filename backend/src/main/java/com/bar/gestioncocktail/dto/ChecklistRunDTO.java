package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ChecklistCategory;
import com.bar.gestioncocktail.model.ChecklistRun;
import com.bar.gestioncocktail.model.ChecklistRunStatus;
import com.bar.gestioncocktail.model.User;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Data Transfer Object representing an operational checklist run execution.
 *
 * @param id                   Run unique identifier
 * @param templateId           Original template identifier (nullable)
 * @param templateTitle        Snapshot of template title
 * @param category             Operational category
 * @param status               Execution lifecycle status (IN_PROGRESS, COMPLETED, CANCELLED)
 * @param startedAt            Start timestamp
 * @param completedAt          Completion timestamp
 * @param createdByUserId      User ID who initiated run
 * @param createdByUsername    Username of initiator
 * @param createdByFullName    Full name of initiator
 * @param completedByUserId    User ID who finalized run
 * @param completedByUsername  Username of finalizer
 * @param completedByFullName  Full name of finalizer
 * @param notes                General run notes or shift handover comments
 * @param completionPercentage Progress percentage (0 to 100)
 * @param progressPercentage   Progress percentage alias for frontend binding
 * @param mandatoryPendingCount Count of mandatory items still pending
 * @param completedItemsCount  Number of completed tasks
 * @param totalItemsCount      Total number of tasks
 * @param items                Tasks executed within this run
 */
public record ChecklistRunDTO(
        Long id,
        Long templateId,
        String templateTitle,
        ChecklistCategory category,
        ChecklistRunStatus status,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        Long createdByUserId,
        String createdByUsername,
        String createdByFullName,
        Long completedByUserId,
        String completedByUsername,
        String completedByFullName,
        String notes,
        int completionPercentage,
        int progressPercentage,
        int mandatoryPendingCount,
        int completedItemsCount,
        int totalItemsCount,
        List<ChecklistRunItemDTO> items
) {
    /**
     * Converts a JPA entity into its DTO representation.
     *
     * @param run Source entity
     * @return Transformed DTO
     */
    public static ChecklistRunDTO from(ChecklistRun run) {
        if (run == null) {
            return null;
        }

        List<ChecklistRunItemDTO> itemList = run.getItems() != null
                ? run.getItems().stream().map(ChecklistRunItemDTO::from).toList()
                : Collections.emptyList();

        int progress = run.getCompletionPercentage();

        return new ChecklistRunDTO(
                run.getId(),
                run.getTemplateId(),
                run.getTemplateTitle(),
                run.getCategory(),
                run.getStatus(),
                run.getStartedAt(),
                run.getCompletedAt(),
                run.getCreatedBy() != null ? run.getCreatedBy().getId() : null,
                run.getCreatedBy() != null ? run.getCreatedBy().getUsername() : null,
                resolveFullName(run.getCreatedBy()),
                run.getCompletedBy() != null ? run.getCompletedBy().getId() : null,
                run.getCompletedBy() != null ? run.getCompletedBy().getUsername() : null,
                resolveFullName(run.getCompletedBy()),
                run.getNotes(),
                progress,
                progress,
                run.getMandatoryPendingCount(),
                run.getCompletedItemsCount(),
                run.getTotalItemsCount(),
                itemList
        );
    }

    private static String resolveFullName(User user) {
        if (user == null) {
            return null;
        }
        String prenom = user.getPrenom() != null ? user.getPrenom() : "";
        String nom = user.getNom() != null ? user.getNom() : "";
        String full = (prenom + " " + nom).trim();
        return full.isEmpty() ? user.getUsername() : full;
    }
}
