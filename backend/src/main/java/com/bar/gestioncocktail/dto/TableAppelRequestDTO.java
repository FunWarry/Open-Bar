package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.TableAppelType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Data Transfer Object for creating a new table alert request.
 *
 * @param type Alert category (ASSISTANCE or ADDITION)
 * @param commentaire Optional message or remark from the patron
 */
@Schema(description = "Request body payload for calling a waiter or requesting the bill from a table")
public record TableAppelRequestDTO(
        @NotNull(message = "Alert type is required")
        @Schema(description = "Alert type", example = "ASSISTANCE", requiredMode = Schema.RequiredMode.REQUIRED)
        TableAppelType type,

        @Size(max = 255, message = "Comment cannot exceed 255 characters")
        @Schema(description = "Optional patron comment or specification", example = "Besoin d'eau supplémentaire")
        String commentaire
) {
        /**
         * Convenience constructor defaulting to ASSISTANCE when no type is passed.
         */
        public TableAppelRequestDTO() {
                this(TableAppelType.ASSISTANCE, null);
        }
}
