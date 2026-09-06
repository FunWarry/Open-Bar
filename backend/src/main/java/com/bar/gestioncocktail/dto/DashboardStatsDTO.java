package com.bar.gestioncocktail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

/**
 * Data Transfer Object containing consolidated metrics and statistics for the Manager Dashboard.
 *
 * @param commandesTotales Total number of placed orders
 * @param commandesEnAttente Count of pending orders
 * @param commandesEnPreparation Count of orders in preparation
 * @param commandesPret Count of orders ready to be served
 * @param commandesLivrees Count of delivered/completed orders
 * @param chiffreAffairesJour Total daily revenue in euros
 * @param chiffreAffairesMois Total monthly revenue in euros
 * @param tablesOccupees Number of occupied tables
 * @param tablesTotales Total number of registered tables
 * @param topCocktails Top performing cocktails ranking
 * @param stockIngredientsCritiques Number of ingredients currently below safety stock threshold
 * @param totalCogsJour Total daily Cost of Goods Sold (COGS) in euros
 * @param margeBruteJour Total daily gross profit margin in euros
 * @param tauxMargeBruteJour Daily gross profit margin percentage
 * @param mostProfitableCocktails Most profitable cocktail items ranking
 */
@Schema(description = "Consolidated dashboard KPIs, operations metrics, and gross margin analytics for manager overview")
public record DashboardStatsDTO(
    @Schema(description = "Total orders count", example = "42")
    long commandesTotales,
    @Schema(description = "Pending orders count", example = "3")
    long commandesEnAttente,
    @Schema(description = "Orders in preparation count", example = "2")
    long commandesEnPreparation,
    @Schema(description = "Ready orders count", example = "1")
    long commandesPret,
    @Schema(description = "Delivered orders count", example = "36")
    long commandesLivrees,
    @Schema(description = "Daily revenue in EUR", example = "580.50")
    BigDecimal chiffreAffairesJour,
    @Schema(description = "Monthly revenue in EUR", example = "12450.00")
    BigDecimal chiffreAffairesMois,
    @Schema(description = "Occupied tables count", example = "8")
    long tablesOccupees,
    @Schema(description = "Total registered tables count", example = "20")
    long tablesTotales,
    @Schema(description = "Top selling cocktails of the day")
    List<TopCocktailDTO> topCocktails,
    @Schema(description = "Count of critical stock alert items", example = "0")
    long stockIngredientsCritiques,
    @Schema(description = "Total Cost of Goods Sold (COGS) today in EUR", example = "95.20")
    BigDecimal totalCogsJour,
    @Schema(description = "Total gross margin amount today in EUR", example = "388.55")
    BigDecimal margeBruteJour,
    @Schema(description = "Gross margin percentage today", example = "80.32")
    BigDecimal tauxMargeBruteJour,
    @Schema(description = "Most profitable cocktails ranking")
    List<ProfitableCocktailDTO> mostProfitableCocktails
) {
    /**
     * Backward-compatible constructor without margin analytics.
     */
    public DashboardStatsDTO(
        long commandesTotales,
        long commandesEnAttente,
        long commandesEnPreparation,
        long commandesPret,
        long commandesLivrees,
        BigDecimal chiffreAffairesJour,
        BigDecimal chiffreAffairesMois,
        long tablesOccupees,
        long tablesTotales,
        List<TopCocktailDTO> topCocktails,
        long stockIngredientsCritiques
    ) {
        this(
            commandesTotales,
            commandesEnAttente,
            commandesEnPreparation,
            commandesPret,
            commandesLivrees,
            chiffreAffairesJour,
            chiffreAffairesMois,
            tablesOccupees,
            tablesTotales,
            topCocktails,
            stockIngredientsCritiques,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            Collections.emptyList()
        );
    }
}
