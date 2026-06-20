export type CocktailCategorie =
  | 'ALCOOLISE'
  | 'SANS_ALCOOL'
  | 'SHOT'
  | 'APERITIF'
  | 'DIGESTIF'
  | 'SPECIAL';

export interface CocktailIngredientItem {
  id: number;
  ingredientId: number;
  ingredientNom: string;
  quantite: number;
  uniteMesure: string;
}

export interface CocktailVariante {
  id: number;
  nom: string;
  description?: string;
  prixSupplement: number;
  disponible: boolean;
}

export interface Cocktail {
  id: number;
  nom: string;
  description?: string;
  prix: number;
  categorie: CocktailCategorie;
  disponible: boolean;
  saisonnier: boolean;
  dateDebutSaison?: string;
  dateFinSaison?: string;
  ingredients: CocktailIngredientItem[];
  variantes: CocktailVariante[];
  instructions?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
