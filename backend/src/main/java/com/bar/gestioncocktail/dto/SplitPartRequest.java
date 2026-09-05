package com.bar.gestioncocktail.dto;

import java.util.List;

/**
 * Request DTO representing a guest's share in an itemized invoice split.
 * Supports legacy list of item IDs or detailed list of item selections with quantities.
 *
 * @param nomConvive Name or label of the guest
 * @param itemIds Legacy list of item IDs allocated in full
 * @param items Detailed item selections with specific quantities allocated
 */
public record SplitPartRequest(
    String nomConvive,
    List<Long> itemIds,
    List<SplitPartItemRequest> items
) {
    public SplitPartRequest(String nomConvive, List<Long> itemIds) {
        this(nomConvive, itemIds, null);
    }
}
