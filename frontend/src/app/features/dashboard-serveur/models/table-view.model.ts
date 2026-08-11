export type TableStatut = 'Libre' | 'Occupée' | 'EnCours' | 'Réservée' | 'EnPaiement';

export interface TableView {
  id: number;
  nom: string;
  zone: string;
  etage?: string;
  capacite: number;
  occupee: boolean;
  serveurNom?: string;
  commandesActives: CommandeResume[];
  planX?: number;
  planY?: number;
  planForme?: string;
  planRotation?: number;
}

export interface CommandeResume {
  id: number;
  statut: string;
  itemCount: number;
  total: number;
}
