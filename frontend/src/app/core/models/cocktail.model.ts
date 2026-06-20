export type CocktailCategorie =
  | 'ALCOOLISE'
  | 'SANS_ALCOOL'
  | 'SHOT'
  | 'APERITIF'
  | 'DIGESTIF'
  | 'SPECIAL';

export interface CocktailIngredientItem {
  id: number;
  ingredientId: number;
  ingredientNom: string;
  quantite: number;
  uniteMesure: string;
}

export interface CocktailVariante {
  id: number;
  nom: string;
  description?: string;
  /** Prix mappé depuis BigDecimal Java — affichage uniquement, pas de calcul JS direct */
  prixSupplement: number;
  disponible: boolean;
}

type SaisonInfo =
  | { saisonnier: false; dateDebutSaison?: never; dateFinSaison?: never }
  | { saisonnier: true; dateDebutSaison: string; dateFinSaison: string };

type CocktailBase = {
  id: number;
  nom: string;
  description?: string;
  /** Prix mappé depuis BigDecimal Java — affichage uniquement, pas de calcul JS direct */
  prix: number;
  categorie: CocktailCategorie;
  disponible: boolean;
  ingredients: CocktailIngredientItem[];
  variantes: CocktailVariante[];
  instructions?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type Cocktail = CocktailBase & SaisonInfo;
