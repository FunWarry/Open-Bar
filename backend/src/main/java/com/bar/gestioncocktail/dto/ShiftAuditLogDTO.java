package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.ShiftAuditAction;
import com.bar.gestioncocktail.model.ShiftAuditLog;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Data Transfer Object representing an immutable shift audit log entry.
 *
 * @param id Unique audit log identifier
 * @param shiftId Associated shift identifier
 * @param userId Target employee user identifier
 * @param userName Target employee username
 * @param userNom Target employee family name
 * @param userPrenom Target employee given name
 * @param dateShift Date of the audited shift
 * @param action Audit action (CREATED, UPDATED, DELETED)
 * @param changedBy Username of the author who performed the change
 * @param changedAt Timestamp when the modification occurred
 * @param previousSnapshot JSON string of shift state before change
 * @param newSnapshot JSON string of shift state after change
 */
public record ShiftAuditLogDTO(
        Long id,
        Long shiftId,
        Long userId,
        String userName,
        String userNom,
        String userPrenom,
        LocalDate dateShift,
        ShiftAuditAction action,
        String changedBy,
        LocalDateTime changedAt,
        String previousSnapshot,
        String newSnapshot
) {
    /**
     * Converts a {@link ShiftAuditLog} entity into a {@link ShiftAuditLogDTO}.
     *
     * @param log Audit log entity
     * @return Audit log DTO or null if entity is null
     */
    public static ShiftAuditLogDTO from(ShiftAuditLog log) {
        if (log == null) {
            return null;
        }
        return new ShiftAuditLogDTO(
                log.getId(),
                log.getShiftId(),
                log.getUser() != null ? log.getUser().getId() : null,
                log.getUser() != null ? log.getUser().getUsername() : null,
                log.getUser() != null ? log.getUser().getNom() : null,
                log.getUser() != null ? log.getUser().getPrenom() : null,
                log.getDateShift(),
                log.getAction(),
                log.getChangedBy(),
                log.getChangedAt(),
                log.getPreviousSnapshot(),
                log.getNewSnapshot()
        );
    }
}
