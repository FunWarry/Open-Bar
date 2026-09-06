export type CommandeStatut =
  | 'EN_ATTENTE'
  | 'EN_PREPARATION'
  | 'PRET'
  | 'LIVREE'
  | 'REGLEE'
  | 'ANNULEE';

export type PreparationStation = 'BAR' | 'KITCHEN' | 'SNACK';

export interface CommandeItem {
  id: number;
  cocktailId: number;
  cocktailNom: string;
  station?: PreparationStation;
  statut?: CommandeStatut;
  varianteId?: number;
  varianteNom?: string;
  quantite: number;
  /** Mapped from Java BigDecimal — display only, not for direct JS financial math */
  prixUnitaire: number;
  notes?: string;
  prioritaire?: boolean;
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
  prioritaire?: boolean;
  /** Mapped from Java BigDecimal — display only, not for direct JS financial math */
  total: number;
  pourboire?: number;
  dateCommande: string;
  datePreparation?: string;
  datePret?: string;
  dateLivraison?: string;
  dateReglement?: string;
  trackingToken?: string;
  clientRequestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommandeRequest {
  tableId: number;
  notes?: string;
  items?: Array<{
    cocktailId: number;
    quantite: number;
    prixUnitaire?: number;
    varianteId?: number;
    notes?: string;
    prioritaire?: boolean;
  }>;
  sessionToken?: string | null;
  clientRequestId?: string;
}

export interface OfflineQueuedOrderItem {
  cocktailId: number;
  cocktailNom?: string;
  quantite: number;
  prixUnitaire: number;
  varianteId?: number;
  varianteNom?: string;
  notes?: string;
  prioritaire?: boolean;
}

export interface OfflineQueuedOrder {
  clientRequestId: string;
  tableId: number;
  tableNumero?: number;
  notes?: string;
  items: OfflineQueuedOrderItem[];
  createdAt: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
  lastError?: string;
}

export interface AjouterItemRequest {
  cocktailId: number;
  varianteId?: number;
  quantite: number;
  prixUnitaire: number;
  notes?: string;
}
