package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.PurchaseOrderItem;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Data Transfer Object representing an individual purchase order line item.
 *
 * @param id                      Unique line item identifier
 * @param ingredientId            Associated ingredient identifier
 * @param ingredientNom           Ingredient name
 * @param uniteMesure             Ingredient measurement unit
 * @param quantiteCommandee       Quantity ordered
 * @param quantiteRecue           Quantity currently received
 * @param prixUnitaireHt          Unit purchase price excluding VAT
 * @param tauxTva                 VAT rate percentage (e.g. 20.00)
 * @param totalHt                 Total line price excluding VAT
 * @param totalTtc                Total line price including VAT
 * @param purchaseUnit            Packaging unit name (e.g. Bottle, Box, Unit)
 * @param packagingCapacity       Capacity per purchase unit in stock units
 * @param equivalentStockQuantity Total equivalent quantity in stock units
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
        BigDecimal totalTtc,
        String purchaseUnit,
        BigDecimal packagingCapacity,
        BigDecimal equivalentStockQuantity
) {
    /**
     * Backward-compatible constructor for 10-parameter invocations.
     */
    public PurchaseOrderItemDTO(
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
        this(
                id,
                ingredientId,
                ingredientNom,
                uniteMesure,
                quantiteCommandee,
                quantiteRecue,
                prixUnitaireHt,
                tauxTva,
                totalHt,
                totalTtc,
                uniteMesure,
                BigDecimal.ONE,
                quantiteCommandee != null ? quantiteCommandee : BigDecimal.ZERO
        );
    }

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
        BigDecimal totalTtc = calculateLineTotalTtc(totalHt, item.getTauxTva());

        Long ingId = item.getIngredient() != null ? item.getIngredient().getId() : null;
        String ingNom = item.getIngredient() != null ? item.getIngredient().getNom() : "";
        String unit = item.getIngredient() != null ? item.getIngredient().getUniteMesure() : "";

        BigDecimal capacity = resolvePackagingCapacity(item);
        String pUnit = resolvePurchaseUnit(item, unit);
        BigDecimal equivalentStock = qty.multiply(capacity);

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
                totalTtc,
                pUnit,
                capacity,
                equivalentStock
        );
    }

    private static BigDecimal resolvePackagingCapacity(PurchaseOrderItem item) {
        if (item.getPackagingCapacity() != null && item.getPackagingCapacity().compareTo(BigDecimal.ZERO) > 0) {
            return item.getPackagingCapacity();
        }
        if (item.getIngredient() != null) {
            return item.getIngredient().getEffectivePackagingCapacity();
        }
        return BigDecimal.ONE;
    }

    private static String resolvePurchaseUnit(PurchaseOrderItem item, String fallbackUnit) {
        if (item.getPurchaseUnit() != null && !item.getPurchaseUnit().isBlank()) {
            return item.getPurchaseUnit();
        }
        if (item.getIngredient() != null) {
            return item.getIngredient().getEffectivePurchaseUnit();
        }
        return fallbackUnit;
    }

    private static BigDecimal calculateLineTotalTtc(BigDecimal totalHt, BigDecimal tauxTva) {
        BigDecimal vatRate = tauxTva != null ? tauxTva : PurchaseOrderItem.DEFAULT_VAT_RATE;
        BigDecimal safeVatRate = vatRate != null ? vatRate : BigDecimal.valueOf(20);
        BigDecimal vatFactor = BigDecimal.ONE.add(safeVatRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        return totalHt.multiply(vatFactor).setScale(2, RoundingMode.HALF_UP);
    }
}
