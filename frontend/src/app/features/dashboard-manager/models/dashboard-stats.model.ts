export interface DashboardStats {
  commandesTotales: number;
  commandesEnAttente: number;
  commandesEnPreparation: number;
  commandesPret: number;
  commandesLivrees: number;
  chiffreAffairesJour: number;
  chiffreAffairesMois: number;
  tablesOccupees: number;
  tablesTotales: number;
  topCocktails: TopCocktail[];
  stockIngredientsCritiques: number;
}

export interface TopCocktail {
  cocktailId: number;
  nom: string;
  nombreCommandes: number;
}
