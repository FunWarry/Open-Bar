export interface CartItemModel {
  boissonId: number;
  nom: string;
  prix: number;
  quantite: number;
  notes?: string;
  typeBoisson?: string;
}

export interface CartModel {
  tableId: number | null;
  tableNumero?: number;
  items: CartItemModel[];
  noteGenerale?: string;
}
