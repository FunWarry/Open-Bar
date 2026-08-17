package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Glassware;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request DTO for creating or updating a glassware type.
 *
 * @param nom Glassware name (e.g. "Verre Tumbler", "Coupe à Cocktail")
 * @param contenanceCl Capacity in centiliters (e.g. 35.0)
 * @param imageUrl Relative or absolute image path
 * @param description Optional description or recommended uses
 * @param isPredefined Whether this is a system predefined glassware
 */
@Schema(description = "Request DTO for glassware definition")
public record GlasswareRequestDTO(
    @NotBlank(message = "Glassware name is required")
    @Size(max = 100, message = "Name cannot exceed 100 characters")
    @Schema(description = "Glassware name", example = "Verre Tumbler")
    String nom,

    @NotNull(message = "Capacity in cl is required")
    @DecimalMin(value = "0.1", message = "Capacity must be strictly positive")
    @Schema(description = "Capacity in centiliters", example = "35.0")
    BigDecimal contenanceCl,

    @Schema(description = "Image URL or asset path", example = "assets/images/verres/verre_tumbler.png")
    String imageUrl,

    @Schema(description = "Description or usage notes", example = "Idéal pour les Long Drinks et Mojitos")
    String description,

    @Schema(description = "Whether this is a predefined system glass", example = "false")
    Boolean isPredefined
) {
    /**
     * Converts this DTO to a Glassware entity.
     *
     * @return New Glassware entity
     */
    public Glassware toEntity() {
        Glassware g = new Glassware();
        g.setNom(nom);
        g.setContenanceCl(contenanceCl);
        g.setImageUrl(imageUrl != null && !imageUrl.isBlank() ? imageUrl : "assets/images/verres/verre_tumbler.png");
        g.setDescription(description);
        g.setPredefined(isPredefined != null && isPredefined);
        return g;
    }
}
