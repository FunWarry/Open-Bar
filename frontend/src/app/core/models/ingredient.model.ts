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
  { key: 'SOJA', labelKey: 'COCKTAILS.ALLERGENS.SOJA', icon: 'leaf-outline', emoji: '🫘' },
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
  createdAt: string;
  updatedAt: string;
}
