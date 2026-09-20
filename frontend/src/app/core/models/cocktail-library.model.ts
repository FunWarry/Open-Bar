import { FlavorProfile } from './cocktail.model';

/**
 * Itemized ingredient proportion in a library cocktail recipe template.
 */
export interface CocktailLibraryIngredient {
  nom: string;
  quantite: number;
  unite: string;
  degreAlcool?: number;
  coutUnitaire?: number;
  allergens?: string[];
  isVegan?: boolean;
}

/**
 * Standard categorized grouping for base cocktail recipes in the library.
 */
export type CocktailLibraryCategory =
  | 'IBA_CLASSICS'
  | 'TROPICAL'
  | 'SPIRIT_FORWARD'
  | 'MOCKTAILS'
  | 'SHOOTERS'
  | 'APERITIF'
  | 'DIGESTIF'
  | 'CONTEMPORARY';

/**
 * Base alcoholic spirit or beverage classification for cocktails.
 */
export type CocktailBaseSpirit =
  | 'GIN'
  | 'VODKA'
  | 'RUM'
  | 'TEQUILA'
  | 'WHISKEY'
  | 'NON_ALCOHOLIC'
  | 'BEER'
  | 'WINE'
  | 'OTHER';

/**
 * Filter selection for category (all or specific category).
 */
export type CocktailLibraryCategoryFilter = 'ALL' | CocktailLibraryCategory;

/**
 * Filter selection for base spirit (all or specific spirit).
 */
export type CocktailBaseSpiritFilter = 'ALL' | CocktailBaseSpirit;

/**
 * Step action type in library recipe template.
 */
export type CocktailLibraryStepType = 'INGREDIENT' | 'CUSTOM_TEXT';

/**
 * Sequential mixology action step in a library recipe.
 */
export interface CocktailLibraryRecipeStep {
  stepOrder: number;
  stepType: CocktailLibraryStepType;
  actionTitle: string;
  ingredientNom?: string | null;
  quantite?: number | null;
  unite?: string | null;
  customText?: string;
  durationSeconds?: number;
}

/**
 * Standard cocktail recipe template in the preconfigured base library.
 */
export interface CocktailLibraryItem {
  id: string;
  nom: string;
  description: string;
  categorie: string;
  libraryCategory: CocktailLibraryCategory;
  baseSpirit: CocktailBaseSpirit;
  ibaOfficial: boolean;
  prix: number;
  alcoholLevel: number;
  isMocktail: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  glassware: string;
  glasswareImage?: string;
  imageUrl?: string;
  flavorProfiles: FlavorProfile[];
  allergens: string[];
  preparationTimeSeconds: number;
  tags: string[];
  ingredients: CocktailLibraryIngredient[];
  recipeSteps: CocktailLibraryRecipeStep[];
  instructions?: string;
}

/**
 * Filter parameters for querying the base cocktail library catalog.
 */
export interface CocktailLibraryFilterParams {
  category?: CocktailLibraryCategoryFilter;
  baseSpirit?: CocktailBaseSpiritFilter;
  flavor?: string;
  mocktail?: boolean;
  search?: string;
}

/**
 * Request payload for batch importing recipes from the library into catalog.
 */
export interface CocktailLibraryImportRequest {
  cocktailIds?: string[];
  cocktailNames?: string[];
}

/**
 * Detailed report returned upon completion of a batch library import operation.
 */
export interface CocktailLibraryImportResult {
  importedCount: number;
  skippedCount: number;
  newIngredientsCount: number;
  reusedIngredientsCount: number;
  importedCocktails: string[];
  skippedCocktails: string[];
  message: string;
}
