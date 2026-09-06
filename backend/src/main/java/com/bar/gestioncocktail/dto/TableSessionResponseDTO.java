package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TableSession;
import com.bar.gestioncocktail.model.TableSessionStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Response DTO describing an ephemeral table session state and its validity.
 *
 * @param id Unique session identifier
 * @param tableId Identifier of the table
 * @param sessionToken Secret ephemeral token
 * @param status Current status (ACTIVE, CLOSED, EXPIRED)
 * @param openedAt When the session was initialized
 * @param lastActivityAt When the session was last refreshed/active
 * @param expiresAt When the session expires
 * @param valid Whether this session is currently valid for order placement
 * @param message Human-readable message or reason if invalid
 */
@Schema(description = "Ephemeral table session details and ordering authorization status")
public record TableSessionResponseDTO(
        Long id,
        Long tableId,
        String sessionToken,
        TableSessionStatus status,
        LocalDateTime openedAt,
        LocalDateTime lastActivityAt,
        LocalDateTime expiresAt,
        boolean valid,
        String message
) {
    /**
     * Converts a {@link TableSession} entity into a response DTO.
     *
     * @param entity Source table session entity
     * @param isValid Whether the session is considered valid in context
     * @param message Informational or validation message
     * @return Transformed DTO
     */
    public static TableSessionResponseDTO from(TableSession entity, boolean isValid, String message) {
        if (entity == null) {
            return new TableSessionResponseDTO(null, null, null, null, null, null, null, isValid, message);
        }
        return new TableSessionResponseDTO(
                entity.getId(),
                entity.getTableId(),
                entity.getSessionToken(),
                entity.getStatus(),
                entity.getOpenedAt(),
                entity.getLastActivityAt(),
                entity.getExpiresAt(),
                isValid,
                message
        );
    }
}
