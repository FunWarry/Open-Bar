package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.StockMovement;
import com.bar.gestioncocktail.model.StockWasteReason;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO representing an audit stock movement or waste declaration.
 *
 * @param id Unique movement identifier
 * @param ingredientId Identifier of the affected ingredient
 * @param ingredientNom Name of the affected ingredient
 * @param quantity Deducted stock quantity
 * @param unit Measurement unit
 * @param reason Declared reason for stock loss
 * @param reportedById Identifier of the user who logged the event
 * @param reportedByUsername Username of the user who logged the event
 * @param notes Optional contextual notes
 * @param cost Calculated monetary loss value
 * @param recordedAt Timestamp when the movement occurred
 */
public record StockMovementResponseDTO(
    Long id,
    Long ingredientId,
    String ingredientNom,
    BigDecimal quantity,
    String unit,
    StockWasteReason reason,
    Long reportedById,
    String reportedByUsername,
    String notes,
    BigDecimal cost,
    LocalDateTime recordedAt
) {
    /**
     * Converts a {@link StockMovement} entity into its response DTO representation.
     *
     * @param movement The entity to convert
     * @return Converted {@link StockMovementResponseDTO} or {@code null}
     */
    public static StockMovementResponseDTO from(StockMovement movement) {
        if (movement == null) {
            return null;
        }

        Long ingId = movement.getIngredient() != null ? movement.getIngredient().getId() : null;
        String ingNom = movement.getIngredient() != null ? movement.getIngredient().getNom() : null;
        Long repId = movement.getReportedBy() != null ? movement.getReportedBy().getId() : null;
        String repUsername = movement.getReportedBy() != null ? movement.getReportedBy().getUsername() : null;

        return new StockMovementResponseDTO(
            movement.getId(),
            ingId,
            ingNom,
            movement.getQuantity(),
            movement.getUnit(),
            movement.getReason(),
            repId,
            repUsername,
            movement.getNotes(),
            movement.getCost(),
            movement.getRecordedAt()
        );
    }
}
