import { TableAppel, TableAppelType } from '../../../core/models/table-appel.model';

export type TableStatut = 'Libre' | 'Occupée' | 'EnCours' | 'Réservée' | 'EnPaiement';

export interface TableView {
  id: number;
  nom: string;
  zone: string;
  etage?: string;
  capacite: number;
  occupee: boolean;
  serveurNom?: string;
  dateOccupation?: string;
  waitTimeMinutes?: number;
  activeTotal?: number;
  commandesActives: CommandeResume[];
  activeAppels?: TableAppel[];
  activeAppelType?: TableAppelType | null;
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
  dateCommande?: string;
}
