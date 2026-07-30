package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.AuditLog;
import java.time.LocalDateTime;

/**
 * DTO representing an audit log entry returned by REST endpoints.
 */
public record AuditLogResponseDTO(
    Long id,
    Long userId,
    String userUsername,
    String action,
    String entityType,
    Long entityId,
    String details,
    LocalDateTime timestamp
) {
    /**
     * Converts an {@link AuditLog} entity into an {@link AuditLogResponseDTO}.
     *
     * @param log the audit log entity
     * @return DTO representation
     */
    public static AuditLogResponseDTO from(AuditLog log) {
        return new AuditLogResponseDTO(
            log.getId(),
            log.getUser() != null ? log.getUser().getId() : null,
            log.getUser() != null ? log.getUser().getUsername() : "SYSTEM",
            log.getAction(),
            log.getEntityType(),
            log.getEntityId(),
            log.getDetails(),
            log.getTimestamp()
        );
    }
}
