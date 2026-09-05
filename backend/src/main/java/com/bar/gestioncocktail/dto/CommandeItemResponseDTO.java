package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CommandeItem;
import java.math.BigDecimal;

/**
 * Response DTO representing an order item line.
 *
 * @param id Order item identifier
 * @param commandeId Parent order ID
 * @param cocktailId Cocktail ID
 * @param cocktailNom Cocktail name
 * @param varianteId Optional variant ID
 * @param varianteNom Optional variant name
 * @param quantite Quantity ordered
 * @param prixUnitaire Unit price at order time
 * @param notes Line-specific instructions
 * @param prioritaire Priority status flag
 */
public record CommandeItemResponseDTO(
    Long id,
    Long commandeId,
    Long cocktailId,
    String cocktailNom,
    Long varianteId,
    String varianteNom,
    int quantite,
    BigDecimal prixUnitaire,
    String notes,
    boolean prioritaire
) {
    /**
     * Converts a {@link CommandeItem} entity into a response DTO.
     *
     * @param item Entity item
     * @return Corresponding DTO
     */
    public static CommandeItemResponseDTO from(CommandeItem item) {
        Long commandeId = null;
        try {
            if (item.getCommande() != null) {
                commandeId = item.getCommande().getId();
            }
        } catch (Exception _) {
            // Lazy load fallback
        }

        Long cocktailId = null;
        String cocktailNom = null;
        try {
            if (item.getCocktail() != null) {
                cocktailId = item.getCocktail().getId();
                cocktailNom = item.getCocktail().getNom();
            }
        } catch (Exception _) {
            // Lazy load fallback
        }

        Long varianteId = null;
        String varianteNom = null;
        try {
            if (item.getVariante() != null) {
                varianteId = item.getVariante().getId();
                varianteNom = item.getVariante().getNom();
            }
        } catch (Exception _) {
            // Lazy load fallback
        }

        return new CommandeItemResponseDTO(
            item.getId(),
            commandeId,
            cocktailId,
            cocktailNom,
            varianteId,
            varianteNom,
            item.getQuantite(),
            item.getPrixUnitaire(),
            item.getNotes(),
            item.isPrioritaire()
        );
    }
}
