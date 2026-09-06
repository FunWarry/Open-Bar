package com.bar.gestioncocktail.dto;

import com.bar.gestioncocktail.model.StockWasteReason;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Summary DTO reporting consolidated stock shrinkage and waste figures.
 *
 * @param totalMovements Total count of waste declarations recorded
 * @param totalLossValue Consolidated monetary loss in bar currency
 * @param totalQuantityLost Consolidated quantity of items lost
 * @param lossValueByReason Monetary loss mapped by declared reason
 * @param countByReason Event count mapped by declared reason
 */
public record StockWasteSummaryDTO(
    long totalMovements,
    BigDecimal totalLossValue,
    BigDecimal totalQuantityLost,
    Map<StockWasteReason, BigDecimal> lossValueByReason,
    Map<StockWasteReason, Long> countByReason
) {
}
