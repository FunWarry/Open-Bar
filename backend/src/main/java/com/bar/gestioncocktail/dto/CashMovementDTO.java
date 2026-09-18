package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CashMovement;
import com.bar.gestioncocktail.model.CashMovementType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Data transfer object representing an intra-day cash movement within a cash drawer session.
 *
 * @param id Unique movement identifier
 * @param sessionId Identifier of the parent cash drawer session
 * @param movementDate Date of the movement
 * @param type Classification (CASH_IN, CASH_DROP, PAID_OUT)
 * @param amount Positive movement amount
 * @param reason Mandatory business reason
 * @param receiptReference Optional invoice or ticket reference
 * @param performedBy Staff member who logged the movement
 * @param timestamp Timestamp when movement was recorded
 * @param createdAt Entity persistence timestamp
 * @param updatedAt Last update timestamp
 */
@Schema(description = "Representation of an intra-day cash movement (cash in, drop, or paid out)")
public record CashMovementDTO(
        Long id,
        Long sessionId,
        LocalDate movementDate,
        CashMovementType type,
        BigDecimal amount,
        String reason,
        String receiptReference,
        UserResponseDTO performedBy,
        LocalDateTime timestamp,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    /**
     * Converts a {@link CashMovement} entity to a {@link CashMovementDTO}.
     *
     * @param movement Source entity
     * @return Transformed DTO
     */
    public static CashMovementDTO from(CashMovement movement) {
        if (movement == null) {
            return null;
        }
        return new CashMovementDTO(
                movement.getId(),
                movement.getSession() != null ? movement.getSession().getId() : null,
                movement.getMovementDate(),
                movement.getType(),
                movement.getAmount(),
                movement.getReason(),
                movement.getReceiptReference(),
                movement.getPerformedBy() != null ? UserResponseDTO.from(movement.getPerformedBy()) : null,
                movement.getTimestamp(),
                movement.getCreatedAt(),
                movement.getUpdatedAt()
        );
    }
}
