package com.bar.gestioncocktail.event;

import com.bar.gestioncocktail.model.TableEntity;

/**
 * Domain event published when table attributes, occupancy status, or floor plan coordinates change.
 *
 * @param table The updated table entity
 */
public record TableUpdatedEvent(TableEntity table) {
}
