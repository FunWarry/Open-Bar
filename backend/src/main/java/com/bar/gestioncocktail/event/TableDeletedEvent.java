package com.bar.gestioncocktail.event;

/**
 * Domain event published when a table is deleted from the establishment.
 *
 * @param tableId The identifier of the deleted table
 */
public record TableDeletedEvent(Long tableId) {
}
