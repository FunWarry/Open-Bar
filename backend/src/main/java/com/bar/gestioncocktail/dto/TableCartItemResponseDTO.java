package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Output DTO representing an individual item within a collaborative table cart.
 */
@Schema(description = "Collaborative table cart item detail")
public record TableCartItemResponseDTO(
        @Schema(description = "Item ID", example = "1")
        Long id,

        @Schema(description = "Guest session identifier", example = "a3f56e18-6c8a-4d2b-980b-df0e2cf7d1c1")
        String guestSessionId,

        @Schema(description = "Guest name / nickname", example = "Alex")
        String guestName,

        @Schema(description = "Cocktail ID", example = "12")
        Long cocktailId,

        @Schema(description = "Cocktail name", example = "Mojito")
        String cocktailNom,

        @Schema(description = "Cocktail image URL", example = "https://example.com/mojito.jpg")
        String cocktailImageUrl,

        @Schema(description = "Cocktail variant ID", example = "3")
        Long varianteId,

        @Schema(description = "Cocktail variant name", example = "Spicy Mango")
        String varianteNom,

        @Schema(description = "Ordered quantity", example = "2")
        int quantite,

        @Schema(description = "Unit price including variant supplement", example = "9.50")
        BigDecimal prixUnitaire,

        @Schema(description = "Line subtotal (quantite * prixUnitaire)", example = "19.00")
        BigDecimal totalLigne,

        @Schema(description = "Item preparation notes", example = "Extra mint, less ice")
        String notes,

        @Schema(description = "Timestamp when added")
        LocalDateTime createdAt
) {
}
