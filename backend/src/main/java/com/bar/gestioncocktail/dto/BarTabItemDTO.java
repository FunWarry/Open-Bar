package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;

/**
 * Data Transfer Object representing an aggregated beverage line on a customer bar tab.
 *
 * @param cocktailId   Cocktail identifier
 * @param cocktailNom  Cocktail title
 * @param varianteId   Recipe variant identifier (if applicable)
 * @param varianteNom  Recipe variant name (if applicable)
 * @param quantite     Aggregated drink quantity
 * @param prixUnitaire Unit price (including dynamic VAT and promotional happy hour pricing)
 * @param totalLigne   Total line amount
 * @param notes        Aggregated preparation notes
 */
public record BarTabItemDTO(
        Long cocktailId,
        String cocktailNom,
        Long varianteId,
        String varianteNom,
        int quantite,
        BigDecimal prixUnitaire,
        BigDecimal totalLigne,
        String notes
) {
}
