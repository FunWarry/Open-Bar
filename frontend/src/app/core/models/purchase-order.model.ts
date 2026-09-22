/**
 * Lifecycle status of a supplier purchase order.
 */
export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

/**
 * Line item in a purchase order.
 */
export interface PurchaseOrderItem {
  id?: number;
  ingredientId: number;
  ingredientNom?: string;
  ingredientUnite?: string;
  quantiteCommandee: number;
  quantiteRecue?: number;
  prixUnitaireHt: number;
  tauxTva?: number;
  montantHt?: number;
  montantTtc?: number;
}

/**
 * Purchase order entity.
 */
export interface PurchaseOrder {
  id: number;
  numeroCommande: string;
  supplierId: number;
  supplierNom?: string;
  status: PurchaseOrderStatus;
  dateCommande?: string;
  dateLivraisonPrevue?: string;
  dateLivraisonReelle?: string;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  notes?: string;
  referenceFactureFournisseur?: string;
  items: PurchaseOrderItem[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payload to create a purchase order item.
 */
export interface PurchaseOrderItemRequest {
  ingredientId: number;
  quantiteCommandee: number;
  prixUnitaireHt: number;
  tauxTva?: number;
}

/**
 * Payload to create a purchase order.
 */
export interface PurchaseOrderCreateRequest {
  supplierId: number;
  dateLivraisonPrevue?: string;
  notes?: string;
  referenceFactureFournisseur?: string;
  items: PurchaseOrderItemRequest[];
}

/**
 * Item reception check-in line payload.
 */
export interface PurchaseOrderReceptionItemRequest {
  purchaseOrderItemId: number;
  quantiteLivree: number;
  prixUnitaireHt?: number;
  numeroLot?: string;
  datePeremption?: string;
}

/**
 * Delivery reception check-in payload.
 */
export interface PurchaseOrderReceptionRequest {
  numeroBonLivraison?: string;
  notes?: string;
  receptions: PurchaseOrderReceptionItemRequest[];
}

/**
 * Weighted average cost (PAMP) variation result after reception.
 */
export interface PriceVariation {
  ingredientId: number;
  ingredientNom: string;
  ancienPamp: number;
  nouveauPamp: number;
  dernierPrixAchat: number;
  variationPourcentage: number;
  alerteHausse: boolean;
}
