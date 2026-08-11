export interface TableBar {
  id: number;
  numero: number;
  capacite: number;
  zone: string;
  etage?: string;
  occupee: boolean;
  serveurId?: number;
  dateOccupation?: string;
  dateLiberation?: string;
  createdAt: string;
  updatedAt: string;
}
