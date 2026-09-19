package com.bar.gestioncocktail.dto;

/**
 * Request payload for transferring all orders of a bar tab to a physical table, or vice-versa.
 *
 * @param targetTableId Target physical floor plan table identifier (if transferring from tab to table)
 * @param targetTabId   Target customer bar tab identifier (if transferring from table to tab)
 * @param releaseTable  Whether the source physical table should be released upon full transfer
 */
public record BarTabTransferRequest(
        Long targetTableId,
        Long targetTabId,
        Boolean releaseTable
) {
    public Long tableId() {
        return targetTableId;
    }

    public Long tabId() {
        return targetTabId;
    }

    public boolean shouldReleaseTable() {
        return Boolean.TRUE.equals(releaseTable);
    }
}
