package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.TableEntity;

import java.math.BigDecimal;

/**
 * Request DTO representing data to create or update a invoice.
 *
 * @param tableId Identifier of the assigned table
 * @param notes Optional notes for the invoice
 * @param pourboire Tip amount
 * @param modePaiement Payment mode (CB, ESP, etc.)
 */
public record FactureRequestDTO(
    Long tableId,
    String notes,
    BigDecimal pourboire,
    String modePaiement
) {
    /**
     * Converts this DTO into a {@link Facture} JPA entity.
     *
     * @return A new {@link Facture} entity instance
     */
    public Facture toEntity() {
        Facture facture = new Facture();
        if (tableId != null) {
            TableEntity table = new TableEntity();
            table.setId(tableId);
            facture.setTable(table);
        }
        facture.setNotes(notes);
        facture.setPourboire(pourboire);
        facture.setModePaiement(modePaiement);
        return facture;
    }
}
