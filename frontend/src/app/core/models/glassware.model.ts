/**
 * Glassware model representing a glass type with its capacity in cl and optional illustration image.
 */
export interface Glassware {
  id: number;
  nom: string;
  contenanceCl: number;
  imageUrl?: string;
  description?: string;
  isPredefined: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for creating or updating a glassware item.
 */
export interface GlasswareRequest {
  nom: string;
  contenanceCl: number;
  imageUrl?: string;
  description?: string;
  isPredefined?: boolean;
}

/**
 * Glassware assignment item within a multi-glass cocktail presentation.
 */
export interface CocktailGlass {
  id?: number;
  cocktailId?: number;
  glassware?: Glassware;
  glasswareId?: number;
  glasswareNom?: string;
  glasswareContenanceCl?: number;
  glasswareImageUrl?: string;
  glassOrder: number;
  roleLabel?: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Request payload for creating or saving a cocktail glassware assignment.
 */
export interface CocktailGlassRequest {
  glasswareId: number;
  glassOrder: number;
  roleLabel?: string;
  isPrimary?: boolean;
}
