package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing an individual item in a public QR order.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Ordered item line in a public QR order")
public class PublicCommandeItemRequestDTO {

    /**
     * Selected cocktail identifier.
     */
    @NotNull(message = "Cocktail is required")
    @Schema(description = "Cocktail ID", example = "12")
    private Long cocktailId;

    /**
     * Optional selected variant identifier.
     */
    @Schema(description = "Optional variant ID", example = "3")
    private Long varianteId;

    /**
     * Ordered quantity (at least 1).
     */
    @Min(value = 1, message = "Quantity must be at least 1")
    @Schema(description = "Item quantity", example = "2")
    private int quantite = 1;

    /**
     * Special preparation instructions for this item.
     */
    @Schema(description = "Item notes", example = "Extra ice")
    private String notes;
}
