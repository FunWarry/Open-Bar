package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Glassware;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO representing a glassware type.
 *
 * @param id Unique glassware identifier
 * @param nom Glassware name
 * @param contenanceCl Capacity in centiliters
 * @param imageUrl Glassware image or illustration asset path
 * @param description Description or usage notes
 * @param isPredefined Whether this is a predefined system glass
 * @param createdAt Creation timestamp
 * @param updatedAt Last update timestamp
 */
@Schema(description = "Response DTO representing a glassware item")
public record GlasswareResponseDTO(
    @Schema(description = "Glassware ID", example = "1")
    Long id,

    @Schema(description = "Glassware name", example = "Verre Tumbler")
    String nom,

    @Schema(description = "Capacity in centiliters", example = "35.0")
    BigDecimal contenanceCl,

    @Schema(description = "Image asset path", example = "assets/images/verres/verre_tumbler.png")
    String imageUrl,

    @Schema(description = "Description", example = "Idéal pour les Long Drinks")
    String description,

    @Schema(description = "Whether this is a predefined system glass", example = "true")
    boolean isPredefined,

    @Schema(description = "Creation timestamp")
    LocalDateTime createdAt,

    @Schema(description = "Last update timestamp")
    LocalDateTime updatedAt
) {
    /**
     * Factory method creating a response DTO from a Glassware entity.
     *
     * @param entity Source Glassware entity
     * @return Response DTO, or null if entity is null
     */
    public static GlasswareResponseDTO from(Glassware entity) {
        if (entity == null) {
            return null;
        }
        return new GlasswareResponseDTO(
            entity.getId(),
            entity.getNom(),
            entity.getContenanceCl(),
            entity.getImageUrl(),
            entity.getDescription(),
            entity.isPredefined(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
