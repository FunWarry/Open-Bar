/**
 * Individual billed invoice line item.
 */
export interface FactureItem {
  id: number;
  factureId: number;
  commandeItemId: number;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  vatRate?: string;
  priceHT?: number;
  vatAmount?: number;
  notes?: string;
  guestName?: string;
}

export interface SplitItem {
  itemId: number;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

/**
 * Invoice split calculation & settlement strategies.
 */
export enum TypeSplit {
  EGAL = 'EGAL',
  SELECTION = 'SELECTION',
  MONTANT_LIBRE = 'MONTANT_LIBRE',
  POURCENTAGE = 'POURCENTAGE',
  SOLDE = 'SOLDE',
  GLOBAL = 'GLOBAL',
}

/**
 * Type alias accepting either TypeSplit enum members or their string literal values.
 */
export type TypeSplitValue = TypeSplit | `${TypeSplit}`;

export interface FactureReglement {
  id?: number;
  factureId: number;
  nomConvive: string;
  partIndex: number;
  totalParts?: number;
  montant: number;
  pourboire?: number;
  totalRegle: number;
  modePaiement: string;
  typeSplit: TypeSplitValue;
  items?: SplitItem[];
  dateReglement?: string;
}

export interface EncaisserPartRequest {
  nomConvive: string;
  partIndex: number;
  totalParts?: number;
  montant: number;
  pourboire?: number;
  totalRegle: number;
  modePaiement: string;
  typeSplit: TypeSplitValue;
  items?: SplitItem[];
}

export interface Facture {
  id: number;
  tableId: number;
  tableNumero: number;
  numero: string;
  total: number;
  totalHT?: number;
  totalVAT?: number;
  pourboire?: number;
  totalTTC?: number;
  dateFacture: string;
  dateReglement?: string;
  reglee: boolean;
  modePaiement?: string;
  notes?: string;
  serveurNom?: string;
  items: FactureItem[];
  reglements?: FactureReglement[];
  createdAt: string;
  updatedAt: string;
}
