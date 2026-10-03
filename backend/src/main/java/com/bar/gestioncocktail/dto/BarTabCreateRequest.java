package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Request payload for creating a new customer bar tab or running ledger.
 *
 * @param nom              Name or reference of the tab (e.g. "Ardoise Thomas", "Afterwork Tech Corp")
 * @param clientReference  Optional client phone number, corporate name, or pre-authorization reference
 * @param notes            Optional operational or allergy notes
 * @param cautionMontant   Optional pre-authorization or deposit amount
 * @param tableOriginaleId Optional ID of the floor plan table if tab originates from a physical table
 */
public record BarTabCreateRequest(
        @NotBlank(message = "Tab name is required")
        @Size(max = 100, message = "Tab name cannot exceed 100 characters")
        String nom,

        @Size(max = 100, message = "Client reference cannot exceed 100 characters")
        String clientReference,

        String notes,

        BigDecimal cautionMontant,

        Long tableOriginaleId
) {
}
