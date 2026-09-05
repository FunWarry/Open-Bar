/**
 * Dashboard Statistics Model.
 * Represents core metrics and KPIs returned by the Manager Dashboard API.
 */
export interface DashboardStats {
  /** Total number of orders placed. */
  commandesTotales: number;
  /** Number of orders currently pending. */
  commandesEnAttente: number;
  /** Number of orders currently in preparation. */
  commandesEnPreparation: number;
  /** Number of orders ready for serving. */
  commandesPret: number;
  /** Number of orders delivered/served. */
  commandesLivrees: number;
  /** Total revenue generated today in euros. */
  chiffreAffairesJour: number;
  /** Total revenue generated this month in euros. */
  chiffreAffairesMois: number;
  /** Number of currently occupied tables. */
  tablesOccupees: number;
  /** Total count of tables in the establishment. */
  tablesTotales: number;
  /** List of top performing cocktails. */
  topCocktails: TopCocktail[];
  /** Count of ingredients below safety stock alert threshold. */
  stockIngredientsCritiques: number;
}

/**
 * Top Cocktail Sales Performance Metric.
 */
export interface TopCocktail {
  /** Unique cocktail identifier. */
  cocktailId: number;
  /** Cocktail name. */
  nom: string;
  /** Total quantity sold today. */
  nombreCommandes: number;
}
