package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO to update the quantity or notes of an item in the collaborative table cart.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload to update quantity or notes of a collaborative cart item")
public class TableCartItemUpdateRequestDTO {

    @NotBlank(message = "Guest session ID is required")
    @Size(max = 64, message = "Guest session ID cannot exceed 64 characters")
    @Schema(description = "Unique guest session identifier", example = "a3f56e18-6c8a-4d2b-980b-df0e2cf7d1c1")
    private String guestSessionId;

    @Min(value = 0, message = "Quantity must be greater than or equal to 0")
    @Schema(description = "Updated quantity (0 will remove the item)", example = "2")
    private int quantite;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    @Schema(description = "Updated preparation notes", example = "No mint")
    private String notes;
}
