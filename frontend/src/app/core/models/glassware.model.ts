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
