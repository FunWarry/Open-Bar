export type TableZone = string;

export interface TableBar {
  id: number;
  numero: number;
  capacite: number;
  zone: string;
  occupee: boolean;
  serveurId?: number;
  dateOccupation?: string;
  dateLiberation?: string;
  createdAt: string;
  updatedAt: string;
}
