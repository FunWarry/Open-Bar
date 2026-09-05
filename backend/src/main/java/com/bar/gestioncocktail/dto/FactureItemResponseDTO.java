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
    String vatRate,
    BigDecimal priceHT,
    BigDecimal vatAmount,
    String notes
) {
    public static FactureItemResponseDTO from(FactureItem fi) {
        return new FactureItemResponseDTO(
            fi.getId(),
            fi.getFacture() != null ? fi.getFacture().getId() : null,
            fi.getCommandeItem() != null ? fi.getCommandeItem().getId() : null,
            fi.getDescription(),
            fi.getQuantite(),
            fi.getPrixUnitaire(),
            fi.getTotal(),
            fi.getVatRate() != null ? fi.getVatRate().getLabel() : "20%",
            fi.getPriceHT(),
            fi.getVatAmount(),
            fi.getNotes()
        );
    }
}
