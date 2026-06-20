// Le backend stocke la zone en VARCHAR libre — s'assurer que les valeurs insérées en BDD correspondent.
export type TableZone = 'TERRASSE' | 'INTERIEUR' | 'ETAGE';

export interface TableBar {
  id: number;
  numero: number;
  capacite: number;
  zone: TableZone;
  occupee: boolean;
  serveurId?: number;
  dateOccupation?: string;
  dateLiberation?: string;
  createdAt: string;
  updatedAt: string;
}
