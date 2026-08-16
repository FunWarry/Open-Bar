/**
 * Defines the type of recipe step block in the cocktail creator.
 */
export type RecipeStepType = 'INGREDIENT' | 'ACTION_TEMPLATE' | 'CUSTOM_TEXT';

/**
 * Standard mixology action categories.
 */
export type RecipeStepActionType =
  | 'SHAKE'
  | 'STRAIN'
  | 'MUDDLE'
  | 'STIR'
  | 'ADD_ICE'
  | 'POUR'
  | 'TOP_UP'
  | 'GARNISH'
  | 'BLEND'
  | 'FLAME'
  | 'OTHER';

/**
 * Reusable action step template entity model.
 */
export interface RecipeStepTemplate {
  id: number;
  name: string;
  actionType: RecipeStepActionType;
  defaultDurationSeconds: number;
  icon?: string;
  description?: string;
  predefined: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Request payload for creating or updating a recipe step template.
 */
export interface RecipeStepTemplateRequest {
  name: string;
  actionType: RecipeStepActionType;
  defaultDurationSeconds: number;
  icon?: string;
  description?: string;
  isPredefined?: boolean;
}

/**
 * Cocktail ordered recipe step model.
 */
export interface CocktailRecipeStep {
  id?: number;
  stepOrder: number;
  stepType: RecipeStepType;
  ingredientId?: number;
  ingredientNom?: string;
  quantite?: number;
  unite?: string;
  templateId?: number;
  templateName?: string;
  actionType?: RecipeStepActionType;
  actionTitle?: string;
  customText?: string;
  durationSeconds?: number;
}

/**
 * Request payload for creating or saving cocktail recipe steps.
 */
export interface CocktailRecipeStepRequest {
  stepOrder: number;
  stepType: RecipeStepType;
  ingredientId?: number;
  quantite?: number;
  unite?: string;
  templateId?: number;
  actionTitle?: string;
  customText?: string;
  durationSeconds?: number;
}
