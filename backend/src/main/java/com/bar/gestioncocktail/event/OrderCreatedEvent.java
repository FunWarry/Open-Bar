package com.bar.gestioncocktail.event;

import com.bar.gestioncocktail.model.Commande;

/**
 * Domain event published when a new order is created and persisted.
 *
 * @param commande The newly created order entity
 */
public record OrderCreatedEvent(Commande commande) {
}
