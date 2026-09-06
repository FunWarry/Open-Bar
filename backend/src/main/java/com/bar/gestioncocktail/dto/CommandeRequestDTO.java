package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Request DTO for creating or updating an order.
 *
 * @param tableId         Identifier of the table for this order
 * @param serveurId       Optional identifier of the waiter
 * @param notes           Optional notes for the order
 * @param pourboire       Optional tip amount
 * @param clientRequestId Optional idempotency client request UUID for offline background sync
 * @param items           Optional initial list of items to associate with the order
 */
public record CommandeRequestDTO(
    @NotNull(message = "Table is required")
    Long tableId,

    Long serveurId,

    @Size(max = 2000, message = "Notes cannot exceed 2000 characters")
    String notes,

    BigDecimal pourboire,

    String clientRequestId,

    List<@Valid CommandeItemRequestDTO> items
) {
    /**
     * Backward compatibility constructor without clientRequestId and items.
     *
     * @param tableId   Identifier of the table
     * @param serveurId Optional identifier of the waiter
     * @param notes     Optional notes for the order
     * @param pourboire Optional tip amount
     */
    public CommandeRequestDTO(Long tableId, Long serveurId, String notes, BigDecimal pourboire) {
        this(tableId, serveurId, notes, pourboire, null, null);
    }

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
        commande.setClientRequestId(clientRequestId);

        if (items != null && !items.isEmpty()) {
            List<CommandeItem> entityItems = new ArrayList<>();
            for (CommandeItemRequestDTO itemDto : items) {
                if (itemDto != null) {
                    CommandeItem item = itemDto.toEntity();
                    item.setCommande(commande);
                    entityItems.add(item);
                }
            }
            commande.setItems(entityItems);
        }

        return commande;
    }
}
