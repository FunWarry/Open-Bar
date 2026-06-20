package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.Ingredient;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record IngredientResponseDTO(
    Long id,
    String nom,
    String uniteMesure,
    BigDecimal quantiteStock,
    BigDecimal seuilAlerte,
    String numeroLot,
    LocalDateTime datePeremption,
    BigDecimal prixUnitaire,
    String fournisseur,
    String notes,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static IngredientResponseDTO from(Ingredient i) {
        return new IngredientResponseDTO(
            i.getId(), i.getNom(), i.getUniteMesure(), i.getQuantiteStock(),
            i.getSeuilAlerte(), i.getNumeroLot(), i.getDatePeremption(),
            i.getPrixUnitaire(), i.getFournisseur(), i.getNotes(),
            i.getCreatedAt(), i.getUpdatedAt()
        );
    }
}
