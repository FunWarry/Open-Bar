package com.bar.gestioncocktail.dto;

/**
 * Request DTO representing a specific item selection and allocated quantity for a guest in a bill split.
 *
 * @param itemId ID of the invoice line item
 * @param quantite Quantity of this item assigned to the guest
 */
public record SplitPartItemRequest(Long itemId, Integer quantite) {}
