package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TableAppel;
import com.bar.gestioncocktail.model.TableAppelStatut;
import com.bar.gestioncocktail.model.TableAppelType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Data Transfer Object representing a table alert response payload.
 *
 * @param id Unique alert identifier
 * @param tableId Identifier of the associated table
 * @param tableNumero Human-readable table number
 * @param tableZone Zone name of the table
 * @param type Type of alert (ASSISTANCE or ADDITION)
 * @param statut Processing status (EN_ATTENTE, ACQUITTE, ANNULE)
 * @param commentaire Optional patron comment
 * @param acquittePar Username or name of staff member who acknowledged the call
 * @param createdAt Creation timestamp
 * @param updatedAt Last update timestamp
 * @param acquitteAt Timestamp when the call was acknowledged
 */
@Schema(description = "Response payload representing a table call alert")
public record TableAppelResponseDTO(
        @Schema(description = "Unique identifier of the alert", example = "42")
        Long id,

        @Schema(description = "Table identifier", example = "5")
        Long tableId,

        @Schema(description = "Table number", example = "12")
        Integer tableNumero,

        @Schema(description = "Table zone", example = "TERRASSE")
        String tableZone,

        @Schema(description = "Call type", example = "ASSISTANCE")
        TableAppelType type,

        @Schema(description = "Call status", example = "EN_ATTENTE")
        TableAppelStatut statut,

        @Schema(description = "Patron comment", example = "Besoin d'eau")
        String commentaire,

        @Schema(description = "Staff member who acknowledged", example = "Jean")
        String acquittePar,

        @Schema(description = "Alert creation date and time")
        LocalDateTime createdAt,

        @Schema(description = "Alert update date and time")
        LocalDateTime updatedAt,

        @Schema(description = "Alert acknowledgement date and time")
        LocalDateTime acquitteAt
) {
    /**
     * Maps a {@link TableAppel} entity to its corresponding response DTO.
     *
     * @param entity Table alert entity
     * @return Formatted response DTO, or null if entity is null
     */
    public static TableAppelResponseDTO from(TableAppel entity) {
        if (entity == null) {
            return null;
        }

        Long tableId = entity.getTable() != null ? entity.getTable().getId() : null;
        Integer tableNumero = entity.getTable() != null ? entity.getTable().getNumero() : null;
        String tableZone = entity.getTable() != null ? entity.getTable().getZone() : null;

        return new TableAppelResponseDTO(
                entity.getId(),
                tableId,
                tableNumero,
                tableZone,
                entity.getType(),
                entity.getStatut(),
                entity.getCommentaire(),
                entity.getAcquittePar(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getAcquitteAt()
        );
    }
}
