package com.bar.gestioncocktail.event;

import com.bar.gestioncocktail.model.TableEntity;

/**
 * Domain event published when a table is explicitly liberated.
 *
 * @param table The liberated table entity
 */
public record TableLiberatedEvent(TableEntity table) {
}
