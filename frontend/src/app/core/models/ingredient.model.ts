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
  { key: 'SOJA', labelKey: 'COCKTAILS.ALLERGENS.SOJA', icon: 'nutrition-outline', emoji: '🫘' },
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
  'portion',
  'fl oz',
  'oz',
  'lb'
] as const;

export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export interface IngredientUnitDescriptor {
  value: string;
  key: string;
  badgeType: 'primary' | 'success' | 'warning' | 'neutral';
  icon: string;
}

export const INGREDIENT_UNIT_CONFIG: readonly IngredientUnitDescriptor[] = [
  { value: 'cl', key: 'CL', badgeType: 'primary', icon: 'scale-outline' },
  { value: 'ml', key: 'ML', badgeType: 'primary', icon: 'scale-outline' },
  { value: 'L', key: 'L', badgeType: 'primary', icon: 'wine-outline' },
  { value: 'fl oz', key: 'FL_OZ', badgeType: 'primary', icon: 'scale-outline' },
  { value: 'dash', key: 'DASH', badgeType: 'warning', icon: 'color-fill-outline' },
  { value: 'goutte', key: 'GOUTTE', badgeType: 'primary', icon: 'water-outline' },
  { value: 'cuillère', key: 'CUILLERE', badgeType: 'neutral', icon: 'sparkles-outline' },
  { value: 'dose', key: 'DOSE', badgeType: 'primary', icon: 'wine-outline' },
  { value: 'g', key: 'G', badgeType: 'warning', icon: 'scale-outline' },
  { value: 'kg', key: 'KG', badgeType: 'warning', icon: 'scale-outline' },
  { value: 'oz', key: 'OZ', badgeType: 'warning', icon: 'scale-outline' },
  { value: 'lb', key: 'LB', badgeType: 'warning', icon: 'scale-outline' },
  { value: 'pincée', key: 'PINCEE', badgeType: 'warning', icon: 'sparkles-outline' },
  { value: 'pièce', key: 'PIECE', badgeType: 'success', icon: 'cube-outline' },
  { value: 'morceau', key: 'MORCEAU', badgeType: 'success', icon: 'nutrition-outline' },
  { value: 'tranche', key: 'TRANCHE', badgeType: 'success', icon: 'nutrition-outline' },
  { value: 'zeste', key: 'ZESTE', badgeType: 'success', icon: 'leaf-outline' },
  { value: 'feuille', key: 'FEUILLE', badgeType: 'success', icon: 'leaf-outline' },
  { value: 'bouteille', key: 'BOUTEILLE', badgeType: 'neutral', icon: 'wine-outline' },
  { value: 'portion', key: 'PORTION', badgeType: 'neutral', icon: 'cube-outline' },
] as const;

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
 * Represents a single source ingredient and yield ratio in a confection (on-site preparation) mapping.
 * Example: 1 "Citron jaune" yields 3.0 cl of "Jus de citron jaune".
 */
export interface ConfectionSource {
  /** ID of the source (raw) ingredient. */
  sourceIngredientId: number;
  /** Display name of the source ingredient. */
  sourceIngredientNom?: string;
  /** Stock unit of the source ingredient. */
  sourceIngredientUnit?: string;
  /** Yield ratio: how many crafted-ingredient units are produced from 1 source unit. */
  yieldRatio: number;
  /** Unit of the yield output (should match crafted ingredient's uniteMesure). */
  yieldUnit?: string;
  /** Optional notes about this confection source. */
  notes?: string;
}

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
  defaultSupplierId?: number;
  defaultSupplierNom?: string;
  codeBarre?: string;
  notes?: string;
  allergens?: Allergen[];
  degreAlcool?: number;
  isVegan?: boolean;
  category?: string;
  purchaseUnit?: string;
  packagingCapacity?: number;
  packagingPriceHt?: number;
  /** True if this ingredient is crafted on-site from source ingredients. */
  isCrafted?: boolean;
  /** True if this ingredient can also be purchased directly from a supplier. */
  isPurchasable?: boolean;
  /** Confection source mappings (only populated if isCrafted is true). */
  confectionSources?: ConfectionSource[];
  createdAt: string;
  updatedAt: string;
}
