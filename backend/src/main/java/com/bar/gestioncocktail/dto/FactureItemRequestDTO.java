package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CommandeItem;
import com.bar.gestioncocktail.model.FactureItem;

import java.math.BigDecimal;

/**
 * Request DTO representing data to add an item to a invoice.
 *
 * @param commandeItemId Identifier of the related order item
 * @param description Item description
 * @param quantite Quantity ordered
 * @param prixUnitaire Unit price
 * @param notes Optional item notes
 */
public record FactureItemRequestDTO(
    Long commandeItemId,
    String description,
    int quantite,
    BigDecimal prixUnitaire,
    String notes
) {
    /**
     * Converts this DTO into a {@link FactureItem} JPA entity.
     *
     * @return A new {@link FactureItem} entity instance
     */
    public FactureItem toEntity() {
        FactureItem item = new FactureItem();
        if (commandeItemId != null) {
            CommandeItem ci = new CommandeItem();
            ci.setId(commandeItemId);
            item.setCommandeItem(ci);
        }
        item.setDescription(description);
        item.setQuantite(quantite);
        item.setPrixUnitaire(prixUnitaire);
        if (prixUnitaire != null) {
            item.setTotal(prixUnitaire.multiply(new BigDecimal(quantite)));
        }
        item.setNotes(notes);
        return item;
    }
}
