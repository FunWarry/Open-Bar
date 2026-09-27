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

    @Schema(description = "Whether this is a mystery drink won on the roulette", example = "true")
    private Boolean isMysteryDrink = false;

    @Schema(description = "Optional override unit price for mystery drinks", example = "7.50")
    private java.math.BigDecimal prixOverride;

    /**
     * Backward-compatible 6-argument constructor.
     *
     * @param guestSessionId Guest session UUID
     * @param guestName      Guest display nickname
     * @param cocktailId     Cocktail ID
     * @param varianteId     Optional variant ID
     * @param quantite       Quantity
     * @param notes          Special notes
     */
    public TableCartItemRequestDTO(String guestSessionId, String guestName, Long cocktailId, Long varianteId, int quantite, String notes) {
        this.guestSessionId = guestSessionId;
        this.guestName = guestName;
        this.cocktailId = cocktailId;
        this.varianteId = varianteId;
        this.quantite = quantite;
        this.notes = notes;
        this.isMysteryDrink = false;
        this.prixOverride = null;
    }
}
