package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.PurchaseOrderItem;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Data Transfer Object representing an individual purchase order line item.
 *
 * @param id                Unique line item identifier
 * @param ingredientId      Associated ingredient identifier
 * @param ingredientNom     Ingredient name
 * @param uniteMesure       Ingredient measurement unit
 * @param quantiteCommandee Quantity ordered
 * @param quantiteRecue     Quantity currently received
 * @param prixUnitaireHt    Unit purchase price excluding VAT
 * @param tauxTva           VAT rate percentage (e.g. 20.00)
 * @param totalHt           Total line price excluding VAT
 * @param totalTtc          Total line price including VAT
 */
@Schema(description = "Purchase order line item representation")
public record PurchaseOrderItemDTO(
        Long id,
        Long ingredientId,
        String ingredientNom,
        String uniteMesure,
        BigDecimal quantiteCommandee,
        BigDecimal quantiteRecue,
        BigDecimal prixUnitaireHt,
        BigDecimal tauxTva,
        BigDecimal totalHt,
        BigDecimal totalTtc
) {
    /**
     * Builds a {@link PurchaseOrderItemDTO} from a JPA entity.
     *
     * @param item source entity
     * @return populated DTO
     */
    public static PurchaseOrderItemDTO from(PurchaseOrderItem item) {
        if (item == null) {
            return null;
        }

        BigDecimal qty = item.getQuantiteCommandee() != null ? item.getQuantiteCommandee() : BigDecimal.ZERO;
        BigDecimal priceHt = item.getPrixUnitaireHt() != null ? item.getPrixUnitaireHt() : BigDecimal.ZERO;
        BigDecimal totalHt = qty.multiply(priceHt).setScale(2, RoundingMode.HALF_UP);

        BigDecimal vatRate = item.getTauxTva() != null ? item.getTauxTva() : PurchaseOrderItem.DEFAULT_VAT_RATE;
        BigDecimal vatFactor = BigDecimal.ONE.add(vatRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        BigDecimal totalTtc = totalHt.multiply(vatFactor).setScale(2, RoundingMode.HALF_UP);

        Long ingId = item.getIngredient() != null ? item.getIngredient().getId() : null;
        String ingNom = item.getIngredient() != null ? item.getIngredient().getNom() : "";
        String unit = item.getIngredient() != null ? item.getIngredient().getUniteMesure() : "";

        return new PurchaseOrderItemDTO(
                item.getId(),
                ingId,
                ingNom,
                unit,
                item.getQuantiteCommandee(),
                item.getQuantiteRecue(),
                item.getPrixUnitaireHt(),
                item.getTauxTva(),
                totalHt,
                totalTtc
        );
    }
}
