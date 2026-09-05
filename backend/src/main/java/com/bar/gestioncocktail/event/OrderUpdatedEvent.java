package com.bar.gestioncocktail.event;

import com.bar.gestioncocktail.model.Commande;

/**
 * Domain event published when an existing order is modified (items added/removed, notes updated, priority changed).
 *
 * @param commande The updated order entity
 */
public record OrderUpdatedEvent(Commande commande) {
}
