export interface FactureItem {
  id: number;
  factureId: number;
  commandeItemId: number;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  notes?: string;
}

export interface Facture {
  id: number;
  tableId: number;
  tableNumero: number;
  numero: string;
  total: number;
  pourboire?: number;
  totalTTC?: number;
  dateFacture: string;
  dateReglement?: string;
  reglee: boolean;
  modePaiement?: string;
  notes?: string;
  items: FactureItem[];
  createdAt: string;
  updatedAt: string;
}
