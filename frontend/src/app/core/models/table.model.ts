export type TableZone = 'TERASSE' | 'INTERIEUR' | 'ETAGE';

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
