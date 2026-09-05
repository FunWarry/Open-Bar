/**
 * Item summary within an ongoing order for Manager Kanban preview.
 */
export interface OngoingOrderItem {
  /** Ordered cocktail name. */
  cocktailNom: string;
  /** Quantity ordered. */
  quantite: number;
  /** Selected recipe variant if any. */
  varianteNom?: string;
  /** Special instructions or notes. */
  notes?: string;
}

/**
 * Ongoing order view model for the Manager Dashboard.
 */
export interface OngoingOrder {
  /** Unique order identifier. */
  id: number;
  /** Table number. */
  tableNumero: number;
  /** Custom table name or label. */
  tableNom?: string;
  /** Current workflow status. */
  statut: 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET' | 'LIVREE';
  /** ISO timestamp of order placement. */
  dateCommande: string;
  /** Username of the serving staff member. */
  serveurUsername?: string;
  /** Total count of items ordered. */
  itemCount?: number;
  /** Total monetary amount of the order in EUR. */
  total?: number;
  /** Order-level notes or requests. */
  notes?: string;
  /** Detailed lines of items ordered. */
  items?: OngoingOrderItem[];
}

/**
 * Kanban Column definition for Manager operations.
 */
export interface KanbanColumn {
  statut: 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET' | 'LIVREE';
  label: string;
  color: string;
  orders: OngoingOrder[];
}
