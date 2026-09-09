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
