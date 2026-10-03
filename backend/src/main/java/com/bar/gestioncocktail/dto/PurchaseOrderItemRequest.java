package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request payload for a line item within a purchase order creation or edition.
 *
 * @param ingredientId      Target inventory ingredient identifier
 * @param quantiteCommandee Quantity ordered
 * @param prixUnitaireHt    Agreed unit purchase price excluding VAT
 * @param tauxTva           Applicable VAT rate percentage (defaults to 20.00 if null)
 */
@Schema(description = "Line item payload for purchase order creation")
public record PurchaseOrderItemRequest(
        @NotNull(message = "Ingredient is required")
        Long ingredientId,

        @NotNull(message = "Ordered quantity is required")
        @DecimalMin(value = "0.001", message = "Ordered quantity must be positive")
        BigDecimal quantiteCommandee,

        @NotNull(message = "Unit price HT is required")
        @DecimalMin(value = "0.0", message = "Unit price cannot be negative")
        BigDecimal prixUnitaireHt,

        BigDecimal tauxTva,

        String purchaseUnit,

        BigDecimal packagingCapacity
) {
    /**
     * Backward-compatible constructor without packaging fields.
     */
    public PurchaseOrderItemRequest(Long ingredientId, BigDecimal quantiteCommandee, BigDecimal prixUnitaireHt, BigDecimal tauxTva) {
        this(ingredientId, quantiteCommandee, prixUnitaireHt, tauxTva, null, null);
    }
}
