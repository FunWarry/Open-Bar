package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

/**
 * Data Transfer Object containing consolidated financial health, COGS, and gross margin analytics for the manager dashboard.
 *
 * @param chiffreAffairesJourTTC Total daily revenue including VAT in EUR
 * @param chiffreAffairesJourHT  Total daily revenue excluding VAT in EUR
 * @param totalCogsJour          Total daily Cost of Goods Sold (COGS) in EUR
 * @param margeBruteJour         Total daily gross margin in EUR (chiffreAffairesJourHT - totalCogsJour)
 * @param tauxMargeBruteJour     Daily overall gross profit margin percentage ((margeBruteJour / chiffreAffairesJourHT) * 100)
 * @param mostProfitableCocktails List of top profitable cocktails ranked by gross profit margin
 */
@Schema(description = "Consolidated manager dashboard financial health, COGS, and profit margin KPIs")
public record DashboardMarginAnalyticsDTO(
    @Schema(description = "Total daily revenue with VAT in EUR", example = "580.50")
    BigDecimal chiffreAffairesJourTTC,

    @Schema(description = "Total daily revenue without VAT in EUR", example = "483.75")
    BigDecimal chiffreAffairesJourHT,

    @Schema(description = "Total Cost of Goods Sold (COGS) today in EUR", example = "95.20")
    BigDecimal totalCogsJour,

    @Schema(description = "Total daily gross profit margin in EUR", example = "388.55")
    BigDecimal margeBruteJour,

    @Schema(description = "Daily overall gross margin percentage", example = "80.32")
    BigDecimal tauxMargeBruteJour,

    @Schema(description = "Rankings of most profitable cocktails")
    List<ProfitableCocktailDTO> mostProfitableCocktails
) {}
