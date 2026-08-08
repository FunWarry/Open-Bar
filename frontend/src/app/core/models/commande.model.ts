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
  /** Mappé depuis BigDecimal Java — affichage uniquement, pas de calcul JS direct */
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
  /** Mappé depuis BigDecimal Java — affichage uniquement, pas de calcul JS direct */
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
