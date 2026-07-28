package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request DTO for creating or updating an order.
 *
 * @param tableId   Identifier of the table for this order
 * @param serveurId Optional identifier of the waiter
 * @param notes     Optional notes for the order
 * @param pourboire Optional tip amount
 */
public record CommandeRequestDTO(
    @NotNull(message = "La table est obligatoire")
    Long tableId,

    Long serveurId,
    String notes,
    BigDecimal pourboire
) {
    /**
     * Converts this DTO into a {@link Commande} JPA entity.
     *
     * @return A new {@link Commande} entity instance
     */
    public Commande toEntity() {
        Commande commande = new Commande();
        if (tableId != null) {
            TableEntity table = new TableEntity();
            table.setId(tableId);
            commande.setTable(table);
        }
        if (serveurId != null) {
            User serveur = new User();
            serveur.setId(serveurId);
            commande.setServeur(serveur);
        }
        commande.setNotes(notes);
        commande.setPourboire(pourboire);
        return commande;
    }
}
