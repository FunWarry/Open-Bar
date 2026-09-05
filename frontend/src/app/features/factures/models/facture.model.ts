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
}

export interface SplitItem {
  itemId: number;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

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
  typeSplit: 'EGAL' | 'SELECTION';
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
  typeSplit: 'EGAL' | 'SELECTION';
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
