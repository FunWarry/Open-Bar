package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for creating or updating a supplier record.
 *
 * @param nom                Supplier company name
 * @param contactNom         Primary contact person name
 * @param email              Contact email
 * @param telephone          Contact phone number
 * @param adresse            Physical business address
 * @param conditionsPaiement Payment terms (e.g. 30 days net)
 * @param notes              Administrative notes
 * @param actif              Whether supplier is active
 */
@Schema(description = "Payload for creating or editing a supplier")
public record SupplierCreateRequest(
        @NotBlank(message = "Supplier company name is required")
        @Size(max = 255, message = "Company name cannot exceed 255 characters")
        String nom,

        @Size(max = 150, message = "Contact name cannot exceed 150 characters")
        String contactNom,

        @Size(max = 150, message = "Email cannot exceed 150 characters")
        String email,

        @Size(max = 50, message = "Phone cannot exceed 50 characters")
        String telephone,

        @Size(max = 500, message = "Address cannot exceed 500 characters")
        String adresse,

        @Size(max = 100, message = "Payment terms cannot exceed 100 characters")
        String conditionsPaiement,

        String notes,

        Boolean actif
) {
    public SupplierCreateRequest(String nom) {
        this(nom, null, null, null, null, null, null, true);
    }
}
