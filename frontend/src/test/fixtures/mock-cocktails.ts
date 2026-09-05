import { Cocktail, CocktailVariante } from '../../app/core/models/cocktail.model';
import { CocktailRecipeStep } from '../../app/core/models/recipe-step.model';
import { MOCK_GLASSWARE_LIST } from './mock-glassware';

export const MOCK_RECIPE_STEPS_MOJITO: CocktailRecipeStep[] = [
  {
    id: 1,
    cocktailId: 1,
    stepOrder: 1,
    stepType: 'INGREDIENT',
    ingredientId: 1,
    ingredientNom: 'Citron vert',
    quantite: 0.5,
    unite: 'pièce',
    customText: 'Couper en 4 quartiers et déposer dans le verre'
  },
  {
    id: 2,
    cocktailId: 1,
    stepOrder: 2,
    stepType: 'INGREDIENT',
    ingredientId: 2,
    ingredientNom: 'Sucre de canne',
    quantite: 2,
    unite: 'cuillère',
    customText: 'Ajouter le sucre sur les citrons'
  },
  {
    id: 3,
    cocktailId: 1,
    stepOrder: 3,
    stepType: 'INGREDIENT',
    ingredientId: 3,
    ingredientNom: 'Menthe fraîche',
    quantite: 8,
    unite: 'feuille',
    customText: 'Claquer les feuilles de menthe'
  },
  {
    id: 4,
    cocktailId: 1,
    stepOrder: 4,
    stepType: 'ACTION_TEMPLATE',
    templateId: 1,
    templateName: 'Piler (Muddle)',
    durationSeconds: 15,
    customText: 'Piler délicatement pour extraire le jus'
  },
  {
    id: 5,
    cocktailId: 1,
    stepOrder: 5,
    stepType: 'ACTION_TEMPLATE',
    templateId: 5,
    templateName: 'Ajouter des glaçons (Add Ice)',
    durationSeconds: 5,
    customText: 'Remplir de glace pilée'
  },
  {
    id: 6,
    cocktailId: 1,
    stepOrder: 6,
    stepType: 'INGREDIENT',
    ingredientId: 4,
    ingredientNom: 'Rhum blanc',
    quantite: 6,
    unite: 'cl',
    customText: 'Verser le rhum'
  },
  {
    id: 7,
    cocktailId: 1,
    stepOrder: 7,
    stepType: 'ACTION_TEMPLATE',
    templateId: 7,
    templateName: 'Compléter / Top up (Top Up)',
    durationSeconds: 10,
    customText: 'Compléter avec de l\'eau gazeuse'
  },
  {
    id: 8,
    cocktailId: 1,
    stepOrder: 8,
    stepType: 'ACTION_TEMPLATE',
    templateId: 4,
    templateName: 'Remuer au verre à mélange (Stir)',
    durationSeconds: 10,
    customText: 'Remuer de bas en haut'
  },
  {
    id: 9,
    cocktailId: 1,
    stepOrder: 9,
    stepType: 'ACTION_TEMPLATE',
    templateId: 8,
    templateName: 'Garnir & Dresser (Garnish)',
    durationSeconds: 10,
    customText: 'Tête de menthe et paille'
  }
];

export const MOCK_MOJITO_VARIANTES: CocktailVariante[] = [
  {
    id: 1,
    cocktailId: 1,
    nom: 'Mojito Framboise',
    description: 'Version fruitée avec purée de framboises fraîches',
    prixSupplement: 1.5,
    multiplicateurIngredient: 1.0,
    disponible: true,
    instructions: 'Ajouter 3 cl de purée de framboise avant de piler'
  },
  {
    id: 2,
    cocktailId: 1,
    nom: 'Mojito Passion',
    description: 'Version exotique avec jus de fruit de la passion',
    prixSupplement: 1.5,
    multiplicateurIngredient: 1.0,
    disponible: true,
    instructions: 'Ajouter 3 cl de purée de fruit de la passion'
  }
];

export const MOCK_COCKTAIL_MOJITO: Cocktail = {
  id: 1,
  nom: 'Mojito',
  description: 'Le grand classique cubain rafraîchissant au rhum blanc, menthe fraîche et citron vert.',
  prix: 9.5,
  categorie: 'ALCOOLISE',
  disponible: true,
  saisonnier: false,
  glassware: MOCK_GLASSWARE_LIST[0], // Tumbler
  glasswareId: 1,
  imageUrl: 'assets/images/cocktails/mojito.png',
  instructions: 'Piler citron et menthe avec le sucre, ajouter glace pilée, rhum et eau gazeuse.',
  ingredients: [
    { id: 1, ingredientId: 4, ingredientNom: 'Rhum blanc', quantite: 6, uniteMesure: 'cl' },
    { id: 2, ingredientId: 1, ingredientNom: 'Citron vert', quantite: 0.5, uniteMesure: 'pièce' },
    { id: 3, ingredientId: 3, ingredientNom: 'Menthe fraîche', quantite: 8, uniteMesure: 'feuille' },
    { id: 4, ingredientId: 2, ingredientNom: 'Sucre de canne', quantite: 2, uniteMesure: 'cuillère' }
  ],
  variantes: MOCK_MOJITO_VARIANTES,
  recipeSteps: MOCK_RECIPE_STEPS_MOJITO,
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z'
};

export const MOCK_COCKTAIL_MARGARITA: Cocktail = {
  id: 2,
  nom: 'Margarita',
  description: 'Cocktail mexicain emblématique à la tequila, triple sec et citron vert avec buvant givré au sel.',
  prix: 10.0,
  categorie: 'ALCOOLISE',
  disponible: true,
  saisonnier: false,
  glassware: MOCK_GLASSWARE_LIST[3], // Margarita
  glasswareId: 4,
  imageUrl: 'assets/images/cocktails/margarita.png',
  instructions: 'Shaker avec glace et verser dans la coupe givrée au sel.',
  ingredients: [
    { id: 5, ingredientId: 5, ingredientNom: 'Tequila', quantite: 5, uniteMesure: 'cl' },
    { id: 6, ingredientId: 6, ingredientNom: 'Triple sec', quantite: 3, uniteMesure: 'cl' },
    { id: 7, ingredientId: 7, ingredientNom: 'Jus de citron vert', quantite: 2, uniteMesure: 'cl' }
  ],
  variantes: [],
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z'
};

export const MOCK_COCKTAIL_VIRGIN_MOJITO: Cocktail = {
  id: 3,
  nom: 'Virgin Mojito',
  description: 'Version sans alcool pleine de fraîcheur à la menthe, citron vert et limonade artisanale.',
  prix: 6.5,
  categorie: 'SANS_ALCOOL',
  disponible: true,
  saisonnier: false,
  glassware: MOCK_GLASSWARE_LIST[0],
  glasswareId: 1,
  imageUrl: 'assets/images/cocktails/virgin_mojito.png',
  instructions: 'Piler citron et menthe avec le sucre, ajouter glace pilée et compléter à la limonade.',
  ingredients: [
    { id: 8, ingredientId: 1, ingredientNom: 'Citron vert', quantite: 0.5, uniteMesure: 'pièce' },
    { id: 9, ingredientId: 3, ingredientNom: 'Menthe fraîche', quantite: 8, uniteMesure: 'feuille' },
    { id: 10, ingredientId: 2, ingredientNom: 'Sucre de canne', quantite: 2, uniteMesure: 'cuillère' }
  ],
  variantes: [],
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z'
};

export const MOCK_COCKTAIL_NEGRONI: Cocktail = {
  id: 4,
  nom: 'Negroni',
  description: 'Cocktail italien classique et amer, composé à parts égales de Gin, Campari et Vermouth rouge.',
  prix: 11.0,
  categorie: 'ALCOOLISE',
  disponible: true,
  saisonnier: false,
  glassware: MOCK_GLASSWARE_LIST[1], // Old Fashioned
  glasswareId: 2,
  imageUrl: 'assets/images/cocktails/negroni.png',
  instructions: 'Remuer au verre à mélange avec glace et zester une écorce d\'orange.',
  ingredients: [
    { id: 11, ingredientId: 8, ingredientNom: 'Gin', quantite: 3, uniteMesure: 'cl' },
    { id: 12, ingredientId: 9, ingredientNom: 'Campari', quantite: 3, uniteMesure: 'cl' },
    { id: 13, ingredientId: 10, ingredientNom: 'Vermouth rouge', quantite: 3, uniteMesure: 'cl' }
  ],
  variantes: [],
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z'
};

export const MOCK_COCKTAIL_LIST: Cocktail[] = [
  MOCK_COCKTAIL_MOJITO,
  MOCK_COCKTAIL_MARGARITA,
  MOCK_COCKTAIL_VIRGIN_MOJITO,
  MOCK_COCKTAIL_NEGRONI
];

/**
 * Creates a customized mock Cocktail object.
 */
export function createMockCocktail(overrides: Partial<Cocktail> = {}): Cocktail {
  return {
    ...MOCK_COCKTAIL_MOJITO,
    ...overrides
  } as Cocktail;
}
