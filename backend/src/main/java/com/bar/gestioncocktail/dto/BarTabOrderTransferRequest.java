package com.bar.gestioncocktail.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * Request payload for transferring specific individual orders between tables and tabs.
 *
 * @param commandeIds   List of order IDs to reassign
 * @param targetTabId   Target bar tab identifier (if moving orders to a tab)
 * @param targetTableId Target physical table identifier (if moving orders to a table)
 * @param releaseTable  Whether to release source table if no remaining orders
 */
public record BarTabOrderTransferRequest(
        @NotEmpty(message = "Order IDs cannot be empty")
        List<Long> commandeIds,

        Long targetTabId,

        Long targetTableId,

        Boolean releaseTable
) {
    public Long commandeId() {
        return (commandeIds != null && !commandeIds.isEmpty()) ? commandeIds.get(0) : null;
    }

    public boolean shouldReleaseTable() {
        return Boolean.TRUE.equals(releaseTable);
    }
}
