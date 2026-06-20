export interface CommandeView {
  id: number;
  tableNom: string;
  serveurNom: string;
  statut: 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET';
  items: CommandeItemView[];
  notes?: string;
  dateCommande: Date;
  datePreparation?: Date;
  prioritaire: boolean;
}

export interface CommandeItemView {
  id: number;
  cocktailNom: string;
  quantite: number;
  notes?: string;
  prioritaire: boolean;
}
