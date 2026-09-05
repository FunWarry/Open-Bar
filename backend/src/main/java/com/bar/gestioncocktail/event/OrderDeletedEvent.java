package com.bar.gestioncocktail.event;

/**
 * Domain event published when an order is deleted.
 *
 * @param commandeId The identifier of the deleted order
 */
public record OrderDeletedEvent(Long commandeId) {
}
