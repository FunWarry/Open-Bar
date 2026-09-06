/**
 * Declared reasons for stock shrinkage, breakage, or waste in OpenBar.
 */
export type StockWasteReason =
  | 'CASSE'
  | 'PEREMPTION'
  | 'OFFERT_PATRON'
  | 'DEGUSTATION_STAFF'
  | 'ERREUR_PREPARATION';

/**
 * Request payload for declaring an ingredient loss or shrinkage event.
 */
export interface StockWasteRequest {
  ingredientId: number;
  quantity: number;
  reason: StockWasteReason;
  notes?: string;
}

/**
 * Detailed stock movement / waste entry response from the backend.
 */
export interface StockMovement {
  id: number;
  ingredientId: number;
  ingredientNom: string;
  quantity: number;
  unit: string;
  reason: StockWasteReason;
  reportedById?: number;
  reportedByUsername?: string;
  notes?: string;
  cost?: number;
  recordedAt: string;
}

/**
 * Summary metrics of stock shrinkage and waste financial figures.
 */
export interface StockWasteSummary {
  totalMovements: number;
  totalLossValue: number;
  totalQuantityLost: number;
  lossValueByReason: Record<StockWasteReason, number>;
  countByReason: Record<StockWasteReason, number>;
}
