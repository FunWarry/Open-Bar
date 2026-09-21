/**
 * Standard allergen classification for bar ingredients and cocktails.
 */
export type Allergen =
  | 'LAIT'
  | 'GLUTEN'
  | 'OEUF'
  | 'FRUITS_A_COQUE'
  | 'ARACHIDE'
  | 'SULFITES'
  | 'SOJA';

/**
 * Allergen option descriptor with localization key, icon, and visual emoji.
 */
export interface AllergenOption {
  key: Allergen;
  labelKey: string;
  icon: string;
  emoji?: string;
}

/**
 * Standard allergen options shared across cocktail catalog, server ordering, and inventory.
 */
export const DEFAULT_ALLERGEN_OPTIONS: readonly AllergenOption[] = [
  { key: 'LAIT', labelKey: 'COCKTAILS.ALLERGENS.LAIT', icon: 'nutrition-outline', emoji: '🥛' },
  { key: 'GLUTEN', labelKey: 'COCKTAILS.ALLERGENS.GLUTEN', icon: 'leaf-outline', emoji: '🌾' },
  { key: 'OEUF', labelKey: 'COCKTAILS.ALLERGENS.OEUF', icon: 'egg-outline', emoji: '🥚' },
  { key: 'FRUITS_A_COQUE', labelKey: 'COCKTAILS.ALLERGENS.FRUITS_A_COQUE', icon: 'nutrition-outline', emoji: '🌰' },
  { key: 'ARACHIDE', labelKey: 'COCKTAILS.ALLERGENS.ARACHIDE', icon: 'nutrition-outline', emoji: '🥜' },
  { key: 'SULFITES', labelKey: 'COCKTAILS.ALLERGENS.SULFITES', icon: 'wine-outline', emoji: '🍷' },
] as const;

/**
 * Standard units of measure available for mixology recipes, garnishes, and bar inventory.
 */
export const INGREDIENT_UNITS = [
  'cl',
  'ml',
  'L',
  'dash',
  'goutte',
  'cuillère',
  'dose',
  'g',
  'kg',
  'pincée',
  'pièce',
  'morceau',
  'tranche',
  'zeste',
  'feuille',
  'bouteille',
  'portion'
] as const;

export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

/**
 * Standard mixology ingredient category classification.
 */
export const INGREDIENT_CATEGORIES = [
  'dark_liquor',
  'light_liquor',
  'liqueurs',
  'wine_beer',
  'juices',
  'mixers',
  'fruits',
  'herbs',
  'bitters',
  'other'
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export interface IngredientCategoryDescriptor {
  key: IngredientCategory;
  labelKey: string;
  icon: string;
  badgeType: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export const INGREDIENT_CATEGORY_CONFIG: readonly IngredientCategoryDescriptor[] = [
  { key: 'dark_liquor', labelKey: 'SUNBURST.FAMILIES.DARK_LIQUOR', icon: 'wine-outline', badgeType: 'primary' },
  { key: 'light_liquor', labelKey: 'SUNBURST.FAMILIES.LIGHT_LIQUOR', icon: 'flask-outline', badgeType: 'primary' },
  { key: 'liqueurs', labelKey: 'SUNBURST.FAMILIES.LIQUEURS', icon: 'color-fill-outline', badgeType: 'primary' },
  { key: 'wine_beer', labelKey: 'SUNBURST.FAMILIES.WINE_BEER', icon: 'beer-outline', badgeType: 'warning' },
  { key: 'juices', labelKey: 'SUNBURST.FAMILIES.JUICES', icon: 'water-outline', badgeType: 'success' },
  { key: 'mixers', labelKey: 'SUNBURST.FAMILIES.MIXERS', icon: 'sparkles-outline', badgeType: 'warning' },
  { key: 'fruits', labelKey: 'SUNBURST.FAMILIES.FRUITS', icon: 'nutrition-outline', badgeType: 'danger' },
  { key: 'herbs', labelKey: 'SUNBURST.FAMILIES.HERBS', icon: 'leaf-outline', badgeType: 'success' },
  { key: 'bitters', labelKey: 'SUNBURST.FAMILIES.BITTERS', icon: 'flask-outline', badgeType: 'neutral' },
  { key: 'other', labelKey: 'SUNBURST.FAMILIES.OTHER', icon: 'cube-outline', badgeType: 'neutral' },
] as const;

/**
 * Raw beverage ingredient or bottle inventory entity.
 */
export interface Ingredient {
  id: number;
  nom: string;
  uniteMesure: string;
  quantiteStock: number;
  seuilAlerte: number;
  numeroLot?: string;
  datePeremption?: string;
  prixUnitaire?: number;
  unitCost?: number;
  fournisseur?: string;
  notes?: string;
  allergens?: Allergen[];
  degreAlcool?: number;
  isVegan?: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}
