/**
 * Item line stored in active ordering cart.
 */
export interface CartItemModel {
  boissonId: number;
  nom: string;
  prix: number;
  quantite: number;
  notes?: string;
  typeBoisson?: string;
  varianteId?: number;
  varianteNom?: string;
  commentaire?: string;
  exclusions?: string[];
}

export interface CartModel {
  tableId: number | null;
  tableNumero?: number;
  barTabId?: number | null;
  barTabNom?: string;
  items: CartItemModel[];
  noteGenerale?: string;
}
