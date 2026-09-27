package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Summary metrics of variances across an inventory audit session.
 *
 * @param totalTheoreticalValueHt Total book value HT before audit
 * @param totalCountedValueHt Total physically counted value HT
 * @param totalVarianceValueHt Net difference HT (negative indicates net shrinkage)
 * @param totalShrinkageValueHt Absolute sum of negative variances (unexplained loss)
 * @param totalSurplusValueHt Sum of positive variances (surplus stock)
 * @param totalItemsAudited Number of distinct ingredients audited
 * @param itemsWithVarianceCount Number of ingredients exhibiting stock discrepancies
 * @param varianceValueByCategory Breakdown of net variance HT across ingredient families
 * @param countedValueByLocation Breakdown of physical counted value HT across storage rooms
 */
public record InventoryVarianceSummaryDTO(
        BigDecimal totalTheoreticalValueHt,
        BigDecimal totalCountedValueHt,
        BigDecimal totalVarianceValueHt,
        BigDecimal totalShrinkageValueHt,
        BigDecimal totalSurplusValueHt,
        int totalItemsAudited,
        int itemsWithVarianceCount,
        Map<String, BigDecimal> varianceValueByCategory,
        Map<String, BigDecimal> countedValueByLocation
) {
}
