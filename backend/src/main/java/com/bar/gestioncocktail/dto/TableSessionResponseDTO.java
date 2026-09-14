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
 * @param ownerGuestSessionId Session UUID of the table owner / host
 * @param ownerGuestName Nickname of the table owner / host
 * @param isOwner Whether the querying guest is the table owner
 */
@Schema(description = "Ephemeral table session details, ownership, and ordering authorization status")
public record TableSessionResponseDTO(
        Long id,
        Long tableId,
        String sessionToken,
        TableSessionStatus status,
        LocalDateTime openedAt,
        LocalDateTime lastActivityAt,
        LocalDateTime expiresAt,
        boolean valid,
        String message,
        String ownerGuestSessionId,
        String ownerGuestName,
        boolean isOwner
) {
    /**
     * Backward-compatible 9-parameter constructor.
     */
    public TableSessionResponseDTO(
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
        this(id, tableId, sessionToken, status, openedAt, lastActivityAt, expiresAt, valid, message, null, null, false);
    }

    /**
     * Converts a {@link TableSession} entity into a response DTO without guest context.
     *
     * @param entity Source table session entity
     * @param isValid Whether the session is considered valid in context
     * @param message Informational or validation message
     * @return Transformed DTO
     */
    public static TableSessionResponseDTO from(TableSession entity, boolean isValid, String message) {
        return from(entity, isValid, message, null);
    }

    /**
     * Converts a {@link TableSession} entity into a response DTO with querying guest identity context.
     *
     * @param entity Source table session entity
     * @param isValid Whether the session is considered valid in context
     * @param message Informational or validation message
     * @param guestSessionId Querying guest session identifier
     * @return Transformed DTO
     */
    public static TableSessionResponseDTO from(TableSession entity, boolean isValid, String message, String guestSessionId) {
        if (entity == null) {
            return new TableSessionResponseDTO(null, null, null, null, null, null, null, isValid, message, null, null, false);
        }
        boolean isOwner = guestSessionId != null && guestSessionId.equals(entity.getOwnerGuestSessionId());
        return new TableSessionResponseDTO(
                entity.getId(),
                entity.getTableId(),
                entity.getSessionToken(),
                entity.getStatus(),
                entity.getOpenedAt(),
                entity.getLastActivityAt(),
                entity.getExpiresAt(),
                isValid,
                message,
                entity.getOwnerGuestSessionId(),
                entity.getOwnerGuestName(),
                isOwner
        );
    }
}
