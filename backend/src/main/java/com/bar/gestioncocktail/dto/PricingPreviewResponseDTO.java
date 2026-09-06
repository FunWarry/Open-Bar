package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.DiscountType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO providing live pricing simulation results for a drink during or outside Happy Hour windows.
 *
 * @param cocktailId         Unique cocktail identifier
 * @param cocktailNom        Commercial cocktail name
 * @param varianteId         Optional selected variant ID
 * @param varianteNom        Optional selected variant title
 * @param basePrice          Original regular menu price
 * @param effectivePrice     Calculated final price after applying active promotions
 * @param discountAmount     Total monetary savings in EUR
 * @param discountPercentage Relative percentage discount
 * @param isHappyHour        True if a promotional rule was triggered
 * @param appliedRuleId      Identifier of the winning promotional rule
 * @param appliedRuleName    Name of the winning promotional rule
 * @param discountType       Type of discount applied
 * @param discountValue      Configured discount value
 * @param evaluatedAt        Timestamp evaluated for the simulation
 */
@Schema(description = "Live promotional price simulation result for a drink")
public record PricingPreviewResponseDTO(
    Long cocktailId,
    String cocktailNom,
    Long varianteId,
    String varianteNom,
    BigDecimal basePrice,
    BigDecimal effectivePrice,
    BigDecimal discountAmount,
    BigDecimal discountPercentage,
    boolean isHappyHour,
    Long appliedRuleId,
    String appliedRuleName,
    DiscountType discountType,
    BigDecimal discountValue,
    LocalDateTime evaluatedAt
) {
}
