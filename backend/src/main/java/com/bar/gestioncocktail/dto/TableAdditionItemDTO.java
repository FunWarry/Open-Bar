package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * Data transfer object representing an individual item line in a table's bill summary.
 *
 * @param itemId           Unique identifier of the order item
 * @param commandeId       Unique identifier of the associated order
 * @param cocktailId       Unique identifier of the cocktail or product
 * @param cocktailNom      Display name of the cocktail or article
 * @param varianteNom      Optional customization or variant label
 * @param quantite         Quantity ordered
 * @param prixUnitaire     Unit price TTC in EUR
 * @param total            Line total TTC in EUR
 * @param priceHT          Line subtotal without tax (HT)
 * @param vatAmount        Line VAT tax amount
 * @param vatRate          Applied VAT rate percentage label
 */
@Schema(description = "Item line breakdown in a table bill summary")
public record TableAdditionItemDTO(
    Long itemId,
    Long commandeId,
    Long cocktailId,
    String cocktailNom,
    String varianteNom,
    int quantite,
    BigDecimal prixUnitaire,
    BigDecimal total,
    BigDecimal priceHT,
    BigDecimal vatAmount,
    String vatRate
) {
}
