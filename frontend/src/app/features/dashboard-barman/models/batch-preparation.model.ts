import { CommandeItemView, CommandeView, PreparationStation } from './commande-view.model';

/**
 * Reference to an individual order line item participating in an aggregated rush batch round.
 */
export interface CommandeBatchItemRef {
  commandeId: number;
  tableNom: string;
  tableNumero?: number;
  itemId: number;
  quantite: number;
  prioritaire: boolean;
  statut?: 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET' | 'LIVREE' | 'REGLEE' | 'ANNULEE';
  varianteNom?: string;
  notes?: string;
  dateCommande?: Date | string;
}

/**
 * Aggregated mixology ingredient quantity dynamically scaled for a cocktail batch round.
 */
export interface BatchIngredientTotal {
  ingredientId?: number;
  ingredientNom: string;
  unitQuantite: number;
  totalQuantite: number;
  uniteMesure: string;
}

/**
 * Aggregated cocktail batch card view displayed on the Bartender Rush Mode board.
 */
export interface CocktailBatchView {
  cocktailId?: number;
  cocktailNom: string;
  station?: PreparationStation;
  photoUrl?: string;
  totalQuantity: number;
  pendingQuantity: number;
  preparingQuantity: number;
  isUrgent: boolean;
  earliestOrderDate?: Date | string;
  tableSummaries: string[];
  items: CommandeBatchItemRef[];
  ingredients: BatchIngredientTotal[];
  sampleItem: CommandeItemView;
  sampleCommande: CommandeView;
}
