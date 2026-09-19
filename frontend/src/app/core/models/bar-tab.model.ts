/**
 * Possible lifecycle states for a customer bar tab.
 */
export type BarTabStatus = 'ACTIVE' | 'SETTLED' | 'TRANSFERRED' | 'CANCELLED';

/**
 * Summary representation of a customer bar tab.
 */
export interface BarTab {
  id: number;
  nom: string;
  clientReference?: string;
  notes?: string;
  cautionMontant?: number;
  statut: BarTabStatus;
  serveurId?: number;
  serveurNom?: string;
  tableOriginaleId?: number;
  tableOriginaleNumero?: number;
  openedAt: string;
  settledAt?: string;
  total: number;
  activeOrdersCount: number;
  itemsCount: number;
}

/**
 * Consolidated drink or dish line item across all orders attached to a bar tab.
 */
export interface BarTabItem {
  cocktailId?: number;
  cocktailNom: string;
  varianteId?: number;
  varianteNom?: string;
  quantite: number;
  prixUnitaire: number;
  totalLigne: number;
  notes?: string;
}

/**
 * Full details of a bar tab including ledger, sub-orders, and tax breakdown.
 */
export interface BarTabDetail {
  tab: BarTab;
  commandes: unknown[];
  items: BarTabItem[];
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  elapsedMinutes: number;
}

/**
 * Payload to create and open a new customer bar tab.
 */
export interface BarTabCreateRequest {
  nom: string;
  clientReference?: string;
  notes?: string;
  cautionMontant?: number;
  tableOriginaleId?: number;
}

/**
 * Payload to update an active bar tab's header metadata.
 */
export interface BarTabUpdateRequest {
  nom?: string;
  clientReference?: string;
  notes?: string;
  cautionMontant?: number;
}

/**
 * Payload to transfer orders between a physical table and a customer bar tab.
 */
export interface BarTabTransferRequest {
  targetTableId?: number;
  targetTabId?: number;
  releaseTable?: boolean;
}

/**
 * Payload to transfer specific order IDs between tabs and tables.
 */
export interface BarTabOrderTransferRequest {
  commandeIds: number[];
  targetTabId?: number;
  targetTableId?: number;
  releaseTable?: boolean;
}
