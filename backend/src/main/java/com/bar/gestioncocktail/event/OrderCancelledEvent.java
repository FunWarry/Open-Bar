package com.bar.gestioncocktail.event;

import com.bar.gestioncocktail.model.Commande;

/**
 * Domain event published when an order is cancelled.
 *
 * @param commande The cancelled order entity
 */
public record OrderCancelledEvent(Commande commande) {
}
