import { Glassware } from './glassware.model';
import { CocktailRecipeStep } from './recipe-step.model';
import { Allergen } from './ingredient.model';
/**
 * Beverage catalog category classification.
 */

export type CocktailCategorie =
  | 'ALCOOLISE'
  | 'SANS_ALCOOL'
  | 'SHOT'
  | 'APERITIF'
  | 'DIGESTIF'
  | 'SPECIAL';

export type FlavorProfile =
  | 'FRUITY'
  | 'SMOKY'
  | 'SWEET'
  | 'SOUR'
  | 'BITTER'
  | 'SPICY'
  | 'HERBAL';

/**
 * Visual configuration for a flavor profile chip.
 */
export interface FlavorProfileConfig {
  key: FlavorProfile;
  labelKey: string;
  icon: string;
  emoji: string;
  badgeClass: string;
}

/**
 * Standard flavor profile items with icons, emojis, and styling classes.
 */
export const DEFAULT_FLAVOR_CONFIGS: readonly FlavorProfileConfig[] = [
  { key: 'FRUITY', labelKey: 'COCKTAIL.FLAVOR_FRUITY', icon: 'water-outline', emoji: '🍓', badgeClass: 'flavor-fruity' },
  { key: 'SMOKY', labelKey: 'COCKTAIL.FLAVOR_SMOKY', icon: 'cloud-outline', emoji: '💨', badgeClass: 'flavor-smoky' },
  { key: 'SWEET', labelKey: 'COCKTAIL.FLAVOR_SWEET', icon: 'sparkles-outline', emoji: '🍯', badgeClass: 'flavor-sweet' },
  { key: 'SOUR', labelKey: 'COCKTAIL.FLAVOR_SOUR', icon: 'water-outline', emoji: '🍋', badgeClass: 'flavor-sour' },
  { key: 'BITTER', labelKey: 'COCKTAIL.FLAVOR_BITTER', icon: 'wine-outline', emoji: '☕', badgeClass: 'flavor-bitter' },
  { key: 'SPICY', labelKey: 'COCKTAIL.FLAVOR_SPICY', icon: 'flame-outline', emoji: '🌶️', badgeClass: 'flavor-spicy' },
  { key: 'HERBAL', labelKey: 'COCKTAIL.FLAVOR_HERBAL', icon: 'leaf-outline', emoji: '🌿', badgeClass: 'flavor-herbal' },
] as const;

export interface CocktailFacets {
  flavorCounts: Record<FlavorProfile, number>;
  mocktailsCount: number;
  veganCount: number;
  glutenFreeCount: number;
  lowAbvCount: number;
  minAlcoholLevel: number;
  maxAlcoholLevel: number;
  totalAvailable: number;
}

export interface CocktailIngredientItem {
  id: number;
  ingredientId: number;
  ingredientNom: string;
  quantite: number;
  uniteMesure: string;
  allergens?: Allergen[];
}

export interface CocktailVarianteIngredient {
  id?: number;
  ingredientId: number;
  ingredientNom?: string;
  quantite: number;
  unite?: string;
  notes?: string;
  allergens?: Allergen[];
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
  recipeCost?: number;
  sellingPriceHT?: number;
  grossMargin?: number;
  grossMarginPercentage?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecipeIngredientCost {
  ingredientId: number;
  nom: string;
  quantiteRecette: number;
  uniteRecette: string;
  prixUnitaireAchat: number;
  uniteMesureAchat: string;
  coutTotalLigne: number;
}

export interface CocktailVarianteMargin {
  varianteId: number;
  nom: string;
  prixTTC: number;
  prixHT: number;
  recipeCost: number;
  grossMargin: number;
  grossMarginPercentage: number;
  ingredients: RecipeIngredientCost[];
}

export interface CocktailMargin {
  cocktailId: number;
  nom: string;
  categorie: string;
  vatRateLabel: string;
  prixTTC: number;
  prixHT: number;
  recipeCost: number;
  grossMargin: number;
  grossMarginPercentage: number;
  ingredients: RecipeIngredientCost[];
  variantes: CocktailVarianteMargin[];
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
  flavorProfiles?: FlavorProfile[];
  alcoholLevel?: number;
  isMocktail?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  station?: 'BAR' | 'KITCHEN' | 'SNACK';
  recipeCost?: number;
  sellingPriceHT?: number;
  grossMargin?: number;
  grossMarginPercentage?: number;
  createdAt: string;
  updatedAt: string;
};

export type Cocktail = CocktailBase & SaisonInfo;
