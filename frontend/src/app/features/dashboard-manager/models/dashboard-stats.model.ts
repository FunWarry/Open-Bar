/**
 * Dashboard Statistics Model.
 * Represents core metrics, financial KPIs, and profitability analytics returned by the Manager Dashboard API.
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
  /** Total Cost of Goods Sold (COGS) today in euros. */
  totalCogsJour?: number;
  /** Total gross profit margin generated today in euros. */
  margeBruteJour?: number;
  /** Overall gross margin percentage today. */
  tauxMargeBruteJour?: number;
  /** Top profitable cocktail items ranking. */
  mostProfitableCocktails?: ProfitableCocktail[];
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

/**
 * Most Profitable Cocktail Item Representation.
 */
export interface ProfitableCocktail {
  /** Cocktail unique identifier. */
  cocktailId: number;
  /** Drink title. */
  nom: string;
  /** Price with VAT in EUR. */
  prixTTC: number;
  /** Price without VAT in EUR. */
  prixHT: number;
  /** Recipe unit cost (COGS) in EUR. */
  recipeCost: number;
  /** Unit gross profit margin in EUR. */
  grossMargin: number;
  /** Gross profit margin percentage. */
  grossMarginPercentage: number;
  /** Total quantity sold today. */
  quantiteVendue: number;
  /** Total margin generated today in EUR. */
  totalMarginGenerated: number;
}

/**
 * Consolidated Manager Dashboard Gross Margin & Financial Health Analytics.
 */
export interface DashboardMarginAnalytics {
  chiffreAffairesJourTTC: number;
  chiffreAffairesJourHT: number;
  totalCogsJour: number;
  margeBruteJour: number;
  tauxMargeBruteJour: number;
  mostProfitableCocktails: ProfitableCocktail[];
}
