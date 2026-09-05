package com.bar.gestioncocktail.event;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;

/**
 * Domain event published when an order transitions from one lifecycle status to another.
 *
 * @param commandeId The unique identifier of the order
 * @param oldStatut  The previous status of the order
 * @param newStatut  The new status of the order
 * @param commande   The updated order entity
 */
public record OrderStatusChangedEvent(
        Long commandeId,
        CommandeStatut oldStatut,
        CommandeStatut newStatut,
        Commande commande
) {
}
