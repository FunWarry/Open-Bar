package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Supplier;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * Data Transfer Object representing a beverage or produce supplier.
 *
 * @param id                 Unique identifier
 * @param nom                Supplier company name
 * @param contactNom         Primary contact person name
 * @param email              Contact email
 * @param telephone          Contact phone number
 * @param adresse            Physical business address
 * @param conditionsPaiement Payment terms (e.g. 30 days net)
 * @param notes              Administrative notes
 * @param actif              Whether supplier is actively active
 * @param createdAt          Record creation timestamp
 * @param updatedAt          Last update timestamp
 */
@Schema(description = "Beverage and produce supplier representation")
public record SupplierDTO(
        Long id,
        String nom,
        String contactNom,
        String email,
        String telephone,
        String adresse,
        String conditionsPaiement,
        String notes,
        Boolean actif,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    /**
     * Constructs a {@link SupplierDTO} from a {@link Supplier} JPA entity.
     *
     * @param s source supplier entity
     * @return populated DTO, or null if source entity is null
     */
    public static SupplierDTO from(Supplier s) {
        if (s == null) {
            return null;
        }
        return new SupplierDTO(
                s.getId(),
                s.getNom(),
                s.getContactNom(),
                s.getEmail(),
                s.getTelephone(),
                s.getAdresse(),
                s.getConditionsPaiement(),
                s.getNotes(),
                s.getActif(),
                s.getCreatedAt(),
                s.getUpdatedAt()
        );
    }
}
