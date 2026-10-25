package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.SafetyAlert;
import com.bar.gestioncocktail.model.SafetyAlertStatus;
import com.bar.gestioncocktail.model.SafetyAlertType;

import java.time.LocalDateTime;

/**
 * Data Transfer Object representing a patron safety alert dispatched to staff dashboards and audit trails.
 *
 * @param id Unique identifier of the safety alert
 * @param tableId Primary key of the originating table
 * @param tableNumero Human-readable table number
 * @param type Angel Shot variant code (ANGEL_SHOT_NEAT, ANGEL_SHOT_ICE, ANGEL_SHOT_LIME)
 * @param typeLabel Localized label of the Angel Shot variant
 * @param status Lifecycle status (ACTIVE, RESOLVED)
 * @param comment Optional confidential patron comment
 * @param resolvedBy Username or display name of the staff member who resolved the alert
 * @param createdAt Creation timestamp
 * @param resolvedAt Resolution timestamp if already attended
 */
public record SafetyAlertResponseDTO(
        Long id,
        Long tableId,
        int tableNumero,
        SafetyAlertType type,
        String typeLabel,
        SafetyAlertStatus status,
        String comment,
        String resolvedBy,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt
) {
    /**
     * Constructs a {@link SafetyAlertResponseDTO} from a {@link SafetyAlert} JPA entity.
     *
     * @param alert Source JPA entity
     * @return Transformed response DTO
     */
    public static SafetyAlertResponseDTO from(SafetyAlert alert) {
        if (alert == null) {
            return null;
        }
        Long tableId = alert.getTable() != null ? alert.getTable().getId() : null;
        int tableNumero = alert.getTable() != null ? alert.getTable().getNumero() : 0;
        String typeLabel = alert.getType() != null ? alert.getType().getLabel() : "";

        return new SafetyAlertResponseDTO(
                alert.getId(),
                tableId,
                tableNumero,
                alert.getType(),
                typeLabel,
                alert.getStatus(),
                alert.getComment(),
                alert.getResolvedBy(),
                alert.getCreatedAt(),
                alert.getResolvedAt()
        );
    }
}
