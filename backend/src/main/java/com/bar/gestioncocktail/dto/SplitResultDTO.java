package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;
import java.util.List;

public record SplitResultDTO(
    Long factureId,
    String nomConvive,
    List<SplitItemDTO> items,
    BigDecimal sousTotal,
    BigDecimal totalAvecPourboire
) {
    public record SplitItemDTO(
        Long itemId,
        String description,
        int quantite,
        BigDecimal prixUnitaire,
        BigDecimal total
    ) {}
}
