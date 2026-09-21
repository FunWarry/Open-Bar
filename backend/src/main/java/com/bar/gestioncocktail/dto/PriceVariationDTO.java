package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.PurchaseOrderDeliveryItem;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDateTime;

/**
 * Data Transfer Object representing a historical price variation and PAMP shift from a delivery event.
 *
 * @param id                     Delivery line unique identifier
 * @param ingredientId           Associated ingredient identifier
 * @param ingredientNom          Ingredient name
 * @param uniteMesure            Ingredient measurement unit
 * @param purchaseOrderReference Document reference of the associated purchase order
 * @param supplierNom            Supplier company name
 * @param bonLivraisonRef        Delivery slip or distributor reference
 * @param dateReception          Timestamp when goods were verified and stocked
 * @param quantiteRecue          Quantity received in this intake
 * @param prixUnitaireHt         Agreed purchase price per unit
 * @param ancienPamp             Previous Weighted Average Cost (PAMP) before intake
 * @param nouveauPamp            Updated Weighted Average Cost (PAMP) after intake
 * @param variationPourcentage   Percentage change between old PAMP and new PAMP
 */
@Schema(description = "Historical delivery and ingredient price variation log")
public record PriceVariationDTO(
        Long id,
        Long ingredientId,
        String ingredientNom,
        String uniteMesure,
        String purchaseOrderReference,
        String supplierNom,
        String bonLivraisonRef,
        LocalDateTime dateReception,
        BigDecimal quantiteRecue,
        BigDecimal prixUnitaireHt,
        BigDecimal ancienPamp,
        BigDecimal nouveauPamp,
        BigDecimal variationPourcentage
) {
    private static final MathContext MC = new MathContext(6, RoundingMode.HALF_UP);

    /**
     * Maps a {@link PurchaseOrderDeliveryItem} entity to this response DTO.
     *
     * @param item source delivery item
     * @return response DTO, or null if source entity is null
     */
    public static PriceVariationDTO from(PurchaseOrderDeliveryItem item) {
        if (item == null) {
            return null;
        }

        Long ingId = item.getIngredient() != null ? item.getIngredient().getId() : null;
        String ingNom = item.getIngredient() != null ? item.getIngredient().getNom() : "";
        String unit = item.getIngredient() != null ? item.getIngredient().getUniteMesure() : "";

        String poRef = "";
        String suppNom = "";
        String blRef = "";
        LocalDateTime receptionDate = null;

        if (item.getDelivery() != null) {
            receptionDate = item.getDelivery().getDateReception();
            blRef = item.getDelivery().getBonLivraisonRef() != null ? item.getDelivery().getBonLivraisonRef() : "";
            if (item.getDelivery().getPurchaseOrder() != null) {
                poRef = item.getDelivery().getPurchaseOrder().getReference();
                if (item.getDelivery().getPurchaseOrder().getSupplier() != null) {
                    suppNom = item.getDelivery().getPurchaseOrder().getSupplier().getNom();
                }
            }
        }

        BigDecimal variation = BigDecimal.ZERO;
        if (item.getAncienPamp() != null && item.getAncienPamp().compareTo(BigDecimal.ZERO) > 0 && item.getNouveauPamp() != null) {
            variation = item.getNouveauPamp().subtract(item.getAncienPamp())
                    .divide(item.getAncienPamp(), MC)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        return new PriceVariationDTO(
                item.getId(),
                ingId,
                ingNom,
                unit,
                poRef,
                suppNom,
                blRef,
                receptionDate,
                item.getQuantiteRecue(),
                item.getPrixUnitaireHt(),
                item.getAncienPamp(),
                item.getNouveauPamp(),
                variation
        );
    }
}
