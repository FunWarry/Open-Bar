export interface FactureItem {
  id: number;
  cocktailNom: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

export interface Facture {
  id: number;
  tableId: number;
  tableNumero: number;
  items: FactureItem[];
  numero: string;
  total: number;
  pourboire?: number;
  totalTTC: number;
  dateFacture: string;
  dateReglement?: string;
  reglee: boolean;
  modePaiement?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReglementRequest {
  modePaiement: string;
  pourboire?: number;
}
