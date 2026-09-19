package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Request payload for updating details of an active bar tab.
 *
 * @param nom              Updated name or title
 * @param clientReference  Updated contact or corporate reference
 * @param notes            Updated operational notes
 * @param cautionMontant   Updated deposit or pre-authorization amount
 * @param tableOriginaleId Optional ID of the floor plan table if tab originates from/relocates to a physical table
 */
public record BarTabUpdateRequest(
        @NotBlank(message = "Tab name is required")
        @Size(max = 100, message = "Tab name cannot exceed 100 characters")
        String nom,

        @Size(max = 100, message = "Client reference cannot exceed 100 characters")
        String clientReference,

        String notes,

        BigDecimal cautionMontant,

        Long tableOriginaleId
) {
    /**
     * Backward-compatible constructor without tableOriginaleId.
     *
     * @param nom             Updated name or title
     * @param clientReference Updated contact or corporate reference
     * @param notes           Updated operational notes
     * @param cautionMontant  Updated deposit or pre-authorization amount
     */
    public BarTabUpdateRequest(String nom, String clientReference, String notes, BigDecimal cautionMontant) {
        this(nom, clientReference, notes, cautionMontant, null);
    }
}
