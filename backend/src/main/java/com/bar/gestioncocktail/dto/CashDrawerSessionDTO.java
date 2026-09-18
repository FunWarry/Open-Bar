package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CashDrawerSession;
import com.bar.gestioncocktail.model.CashDrawerSessionStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Data transfer object representing a physical cash drawer register session.
 *
 * @param id Unique session identifier
 * @param sessionDate Calendar date of the cash drawer session
 * @param status Lifecycle status (OPEN or CLOSED)
 * @param openedAt Timestamp when drawer was opened
 * @param closedAt Timestamp when drawer was closed
 * @param openedBy User who performed the morning opening
 * @param closedBy User who performed the shift closing
 * @param openingFloat Counted opening cash float
 * @param openingFloatBreakdownJson Detailed counting breakdown per denomination in JSON
 * @param notes Optional operator observations
 * @param createdAt Creation timestamp
 * @param updatedAt Last modification timestamp
 */
@Schema(description = "Detailed representation of a cash drawer register session")
public record CashDrawerSessionDTO(
        Long id,
        LocalDate sessionDate,
        CashDrawerSessionStatus status,
        LocalDateTime openedAt,
        LocalDateTime closedAt,
        UserResponseDTO openedBy,
        UserResponseDTO closedBy,
        BigDecimal openingFloat,
        String openingFloatBreakdownJson,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    /**
     * Converts a {@link CashDrawerSession} entity to a {@link CashDrawerSessionDTO}.
     *
     * @param session Source entity
     * @return Transformed DTO
     */
    public static CashDrawerSessionDTO from(CashDrawerSession session) {
        if (session == null) {
            return null;
        }
        return new CashDrawerSessionDTO(
                session.getId(),
                session.getSessionDate(),
                session.getStatus(),
                session.getOpenedAt(),
                session.getClosedAt(),
                session.getOpenedBy() != null ? UserResponseDTO.from(session.getOpenedBy()) : null,
                session.getClosedBy() != null ? UserResponseDTO.from(session.getClosedBy()) : null,
                session.getOpeningFloat(),
                session.getOpeningFloatBreakdownJson(),
                session.getNotes(),
                session.getCreatedAt(),
                session.getUpdatedAt()
        );
    }
}
