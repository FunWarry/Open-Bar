package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.FactureItem;
import java.math.BigDecimal;

public record FactureItemResponseDTO(
    Long id,
    Long factureId,
    Long commandeItemId,
    String description,
    int quantite,
    BigDecimal prixUnitaire,
    BigDecimal total,
    String notes
) {
    public static FactureItemResponseDTO from(FactureItem fi) {
        return new FactureItemResponseDTO(
            fi.getId(),
            fi.getFacture().getId(),
            fi.getCommandeItem().getId(),
            fi.getDescription(),
            fi.getQuantite(),
            fi.getPrixUnitaire(),
            fi.getTotal(),
            fi.getNotes()
        );
    }
}
