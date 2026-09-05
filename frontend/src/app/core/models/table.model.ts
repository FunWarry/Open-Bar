/**
 * Represents a physical or virtual bar table in the OpenBar system.
 */
export interface TableBar {
  id: number;
  numero: number;
  capacite: number;
  zone: string;
  etage?: string;
  emplacement?: string;
  occupee: boolean;
  reservee?: boolean;
  serveurId?: number;
  dateOccupation?: string;
  dateLiberation?: string;
  createdAt: string;
  updatedAt: string;
}
