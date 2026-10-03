/**
 * Supplier entity representing beverage and consumable vendors.
 */
export interface Supplier {
  id: number;
  nom: string;
  contactNom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  siret?: string;
  conditionsPaiement?: string;
  notes?: string;
  actif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payload to create or update a supplier.
 */
export interface SupplierCreateRequest {
  nom: string;
  contactNom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  siret?: string;
  conditionsPaiement?: string;
  notes?: string;
  actif?: boolean;
}
