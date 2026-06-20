export interface Ingredient {
  id: number;
  nom: string;
  uniteMesure: string;
  quantiteStock: number;
  seuilAlerte: number;
  numeroLot?: string;
  datePeremption?: string;
  prixUnitaire?: number;
  fournisseur?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
