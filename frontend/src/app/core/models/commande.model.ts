export type CommandeStatut =
  | 'EN_ATTENTE'
  | 'EN_PREPARATION'
  | 'PRET'
  | 'LIVREE'
  | 'REGLEE'
  | 'ANNULEE';

export interface CommandeItem {
  id: number;
  cocktailId: number;
  cocktailNom: string;
  varianteId?: number;
  varianteNom?: string;
  quantite: number;
  /** Mapped from Java BigDecimal — display only, not for direct JS financial math */
  prixUnitaire: number;
  notes?: string;
}

export interface Commande {
  id: number;
  tableId: number;
  tableNumero: number;
  serveurId: number;
  serveurUsername: string;
  items: CommandeItem[];
  statut: CommandeStatut;
  notes?: string;
  /** Mapped from Java BigDecimal — display only, not for direct JS financial math */
  total: number;
  pourboire?: number;
  dateCommande: string;
  datePreparation?: string;
  dateLivraison?: string;
  dateReglement?: string;
  trackingToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommandeRequest {
  tableId: number;
  notes?: string;
}

export interface AjouterItemRequest {
  cocktailId: number;
  varianteId?: number;
  quantite: number;
  notes?: string;
}
