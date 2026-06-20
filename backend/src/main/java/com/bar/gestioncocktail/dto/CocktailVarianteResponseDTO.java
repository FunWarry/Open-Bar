package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.CocktailVariante;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CocktailVarianteResponseDTO(
    Long id,
    Long cocktailId,
    String nom,
    String description,
    BigDecimal prixSupplement,
    boolean disponible,
    String instructions,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static CocktailVarianteResponseDTO from(CocktailVariante v) {
        return new CocktailVarianteResponseDTO(
            v.getId(),
            v.getCocktail().getId(),
            v.getNom(),
            v.getDescription(),
            v.getPrixSupplement(),
            v.isDisponible(),
            v.getInstructions(),
            v.getCreatedAt(),
            v.getUpdatedAt()
        );
    }
}
