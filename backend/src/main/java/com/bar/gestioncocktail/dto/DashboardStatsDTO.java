package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardStatsDTO(
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
) {}
