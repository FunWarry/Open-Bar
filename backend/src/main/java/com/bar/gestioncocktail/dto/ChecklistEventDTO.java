package com.bar.gestioncocktail.dto;

import java.time.LocalDateTime;

/**
 * Real-time event payload broadcast over WebSocket on {@code /topic/checklists}
 * to synchronize live checklist changes across all connected staff terminals.
 *
 * @param eventType  Type of checklist event (e.g. RUN_STARTED, ITEM_TOGGLED, RUN_COMPLETED, TEMPLATE_UPDATED)
 * @param runId      Impacted run identifier (nullable)
 * @param itemId     Impacted task item identifier (nullable)
 * @param templateId Impacted template identifier (nullable)
 * @param username   Actor username (nullable)
 * @param timestamp  Event timestamp
 * @param run        Full updated run snapshot (nullable)
 * @param template   Full updated template snapshot (nullable)
 */
public record ChecklistEventDTO(
        String eventType,
        Long runId,
        Long itemId,
        Long templateId,
        String username,
        LocalDateTime timestamp,
        ChecklistRunDTO run,
        ChecklistTemplateDTO template
) {
    /**
     * Backward-compatible constructor for run events.
     *
     * @param eventType  Event type
     * @param runId      Run ID
     * @param itemId     Item ID
     * @param templateId Template ID
     * @param username   Username
     * @param timestamp  Timestamp
     * @param run        Run DTO
     */
    public ChecklistEventDTO(
            String eventType,
            Long runId,
            Long itemId,
            Long templateId,
            String username,
            LocalDateTime timestamp,
            ChecklistRunDTO run
    ) {
        this(eventType, runId, itemId, templateId, username, timestamp, run, null);
    }
}
