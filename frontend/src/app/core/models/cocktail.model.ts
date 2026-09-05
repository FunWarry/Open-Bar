import { Glassware } from './glassware.model';
import { CocktailRecipeStep } from './recipe-step.model';

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

export interface CocktailVarianteIngredient {
  id?: number;
  ingredientId: number;
  ingredientNom?: string;
  quantite: number;
  unite?: string;
  notes?: string;
}

export interface CocktailVariante {
  id?: number;
  cocktailId?: number;
  nom: string;
  description?: string;
  /** Price mapped from Java BigDecimal — display only, not for direct JS financial math */
  prixSupplement: number;
  multiplicateurIngredient?: number;
  disponible: boolean;
  instructions?: string;
  ingredients?: CocktailVarianteIngredient[];
  recipeSteps?: CocktailRecipeStep[];
  createdAt?: string;
  updatedAt?: string;
}

type SaisonInfo =
  | { saisonnier: false; dateDebutSaison?: never; dateFinSaison?: never }
  | { saisonnier: true; dateDebutSaison: string; dateFinSaison: string };

type CocktailBase = {
  id: number;
  nom: string;
  description?: string;
  /** Price mapped from Java BigDecimal — display only, not for direct JS financial math */
  prix: number;
  categorie: CocktailCategorie;
  disponible: boolean;
  /** Season start month (1-12), null = year-round */
  moisDebut?: number | null;
  /** Season end month (1-12), null = year-round */
  moisFin?: number | null;
  /** Calculated on backend: is this drink available during the current month? */
  disponibleAujourdhui?: boolean;
  ingredients: CocktailIngredientItem[];
  variantes: CocktailVariante[];
  recipeSteps?: CocktailRecipeStep[];
  glassware?: Glassware;
  glasswareId?: number;
  instructions?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type Cocktail = CocktailBase & SaisonInfo;
