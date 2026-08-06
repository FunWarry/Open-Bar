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
  createdAt: string;
  updatedAt: string;
}
