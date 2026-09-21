import { FlavorProfile } from './cocktail.model';

/**
 * Itemized ingredient proportion in a library cocktail recipe template.
 */
export interface CocktailLibraryIngredient {
  nom: string;
  quantite: number;
  unite: string;
  category?: string;
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
  popularityScore?: number;
  isPopular?: boolean;
  variantFamily?: string | null;
  variationOf?: string | null;
}

/**
 * Sorting criteria options for the cocktail library catalog.
 */
export type CocktailSortOption =
  | 'POPULARITY'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'ALCOHOL_ASC'
  | 'ALCOHOL_DESC'
  | 'INGREDIENTS_COUNT_ASC'
  | 'PRICE_ASC'
  | 'PRICE_DESC';

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

/**
 * Category family metadata in the DrinkWithData connection wheel.
 */
export interface CocktailWheelCategory {
  label: string;
  labelFr?: string;
  short: string;
  shortFr?: string;
  color: string;
}

/**
 * An ingredient node positioned on the connection wheel ring.
 */
export interface CocktailWheelNode {
  id: string;
  label: string;
  group: string;
  subgroup?: string;
  sourceIndex: number;
  count: number;
}

/**
 * A co-occurrence connection between two cocktail ingredients.
 */
export interface CocktailWheelEdge {
  a: string;
  b: string;
  count: number;
}

/**
 * Complete preprocessed dataset for the interactive DrinkWithData connection wheel.
 */
export interface CocktailConnectionWheelData {
  categories: Record<string, CocktailWheelCategory>;
  nodes: CocktailWheelNode[];
  edges: CocktailWheelEdge[];
}

/**
 * Computed ribbon link between two ingredients in the chord layout.
 */
export interface CocktailWheelLink {
  index: number;
  a: string;
  b: string;
  count: number;
  path: string;
  start: [number, number];
  end: [number, number];
  colorA: string;
  colorB: string;
}

/**
 * Positioned node element on the circular chord ring.
 */
export interface CocktailWheelLayoutNode extends CocktailWheelNode {
  segment: {
    index: number;
    startAngle: number;
    endAngle: number;
    value: number;
  };
  arc: string;
  hit: string;
  labelTransform: string;
  anchor: 'start' | 'end';
  isProminent: boolean;
}

/**
 * Family category arc surrounding the outer perimeter of the wheel.
 */
export interface CocktailWheelLayoutFamily extends CocktailWheelCategory {
  id: string;
  count: number;
  arc: string;
  position: [number, number];
}

/**
 * Fully calculated geometry for rendering the SVG chord diagram.
 */
export interface CocktailWheelGeometry {
  links: CocktailWheelLink[];
  nodes: CocktailWheelLayoutNode[];
  families: CocktailWheelLayoutFamily[];
  byIngredient: Map<string, CocktailWheelLink[]>;
  byCategory: Map<string, CocktailWheelLink[]>;
}

