package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO to add or increment an item in the collaborative table cart.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload to add an item to the collaborative table cart")
public class TableCartItemRequestDTO {

    @NotBlank(message = "Guest session ID is required")
    @Size(max = 64, message = "Guest session ID cannot exceed 64 characters")
    @Schema(description = "Unique guest session identifier", example = "a3f56e18-6c8a-4d2b-980b-df0e2cf7d1c1")
    private String guestSessionId;

    @NotBlank(message = "Guest name is required")
    @Size(max = 100, message = "Guest name cannot exceed 100 characters")
    @Schema(description = "Guest nickname", example = "Alex")
    private String guestName;

    @NotNull(message = "Cocktail ID is required")
    @Schema(description = "Selected cocktail identifier", example = "12")
    private Long cocktailId;

    @Schema(description = "Optional variant identifier", example = "3")
    private Long varianteId;

    @Min(value = 1, message = "Quantity must be at least 1")
    @Schema(description = "Ordered quantity", example = "1")
    private int quantite = 1;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    @Schema(description = "Optional preparation notes for this item", example = "Less ice")
    private String notes;
}
