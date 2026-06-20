package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CommandeItem;
import java.math.BigDecimal;

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
    public static CommandeItemResponseDTO from(CommandeItem item) {
        return new CommandeItemResponseDTO(
            item.getId(),
            item.getCommande().getId(),
            item.getCocktail().getId(),
            item.getCocktail().getNom(),
            item.getVariante() != null ? item.getVariante().getId() : null,
            item.getVariante() != null ? item.getVariante().getNom() : null,
            item.getQuantite(),
            item.getPrixUnitaire(),
            item.getNotes(),
            item.isPrioritaire()
        );
    }
}
