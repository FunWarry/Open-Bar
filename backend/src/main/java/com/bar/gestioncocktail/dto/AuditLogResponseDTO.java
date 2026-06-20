package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.AuditLog;
import java.time.LocalDateTime;

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
    public static AuditLogResponseDTO from(AuditLog log) {
        return new AuditLogResponseDTO(
            log.getId(),
            log.getUser().getId(),
            log.getUser().getUsername(),
            log.getAction(),
            log.getEntityType(),
            log.getEntityId(),
            log.getDetails(),
            log.getTimestamp()
        );
    }
}
