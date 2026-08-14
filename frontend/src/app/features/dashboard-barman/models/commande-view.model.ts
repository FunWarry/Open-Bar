/**
 * View model representing a bar counter order displayed in the real-time Kanban board.
 */
export interface CommandeView {
  id: number;
  tableId?: number;
  tableNumero?: number;
  tableNom: string;
  serveurId?: number;
  serveurNom: string;
  serveurUsername?: string;
  statut: 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET' | 'LIVREE' | 'REGLEE' | 'ANNULEE';
  items: CommandeItemView[];
  notes?: string;
  dateCommande: Date | string;
  datePreparation?: Date | string;
  dateLivraison?: Date | string;
  prioritaire: boolean;
  total?: number;
}

/**
 * View model representing an individual order line item on a preparation card.
 */
export interface CommandeItemView {
  id: number;
  cocktailId?: number;
  cocktailNom: string;
  varianteId?: number;
  varianteNom?: string;
  quantite: number;
  prixUnitaire?: number;
  notes?: string;
  prioritaire: boolean;
  ingredients?: Array<{
    id?: number;
    ingredientId?: number;
    ingredientNom: string;
    quantite: number;
    uniteMesure: string;
  }>;
  instructions?: string;
}

/**
 * Filter criteria for the Barman counter Kanban view.
 */
export interface BarmanFilterCriteria {
  searchTerm: string;
  tableFilter: string;
  urgentOnly: boolean;
}

