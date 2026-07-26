export interface OngoingOrder {
  id: number;
  tableNumero: number;
  statut: 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET' | 'LIVREE';
  dateCommande: string;
  serveurUsername?: string;
  itemCount?: number;
}

export interface KanbanColumn {
  statut: 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET' | 'LIVREE';
  label: string;
  color: string;
  orders: OngoingOrder[];
}
