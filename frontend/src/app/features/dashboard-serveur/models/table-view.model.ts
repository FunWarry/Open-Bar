export type TableStatut = 'Libre' | 'Occupée' | 'EnCours' | 'Réservée' | 'EnPaiement';

export interface TableView {
  id: number;
  nom: string;
  zone: string;
  capacite: number;
  occupee: boolean;
  serveurNom?: string;
  commandesActives: CommandeResume[];
}

export interface CommandeResume {
  id: number;
  statut: string;
  itemCount: number;
  total: number;
}
