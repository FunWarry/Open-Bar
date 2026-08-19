import { Glassware, GlasswareRequest } from '../../app/core/models/glassware.model';

/**
 * Predefined mock glassware presets matching backend seeders.
 */
export const MOCK_GLASSWARE_LIST: Glassware[] = [
  {
    id: 1,
    nom: 'Verre Tumbler / Highball',
    contenanceCl: 35.0,
    imageUrl: 'assets/images/verres/verre_tumbler.png',
    description: 'Verre haut cylindrique parfait pour les long drinks gazeux et rafraîchissants.',
    isPredefined: true,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 2,
    nom: 'Verre Old Fashioned / Rocks',
    contenanceCl: 30.0,
    imageUrl: 'assets/images/verres/verre_old_fashioned.png',
    description: 'Verre bas et lourd à fond épais idéal pour les spiritueux sur glace et cocktails remués.',
    isPredefined: true,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 3,
    nom: 'Coupe à Cocktail / Martini',
    contenanceCl: 22.0,
    imageUrl: 'assets/images/verres/verre_martini.png',
    description: 'Coupe élégante sur pied pour cocktails raffinés servis sans glace.',
    isPredefined: true,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 4,
    nom: 'Verre Margarita',
    contenanceCl: 33.0,
    imageUrl: 'assets/images/verres/verre_margarita.png',
    description: 'Coupe évasée à double étage conçue pour accueillir un buvant givré au sel ou au sucre.',
    isPredefined: true,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 5,
    nom: 'Verre Ballon / Copa',
    contenanceCl: 60.0,
    imageUrl: 'assets/images/verres/verre_copa.png',
    description: 'Grand verre ballon généreux permettant d\'emprisonner les arômes et d\'accueillir une grande quantité de glace.',
    isPredefined: true,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 6,
    nom: 'Flûte à Champagne',
    contenanceCl: 18.0,
    imageUrl: 'assets/images/verres/flute_champagne.png',
    description: 'Verre élancé maintenant l\'effervescence et la finesse des bulles.',
    isPredefined: true,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 7,
    nom: 'Tasse en cuivre',
    contenanceCl: 45.0,
    imageUrl: 'assets/images/verres/tasse_cuivre.png',
    description: 'Mug métallique maintenant une fraîcheur glaciale intense.',
    isPredefined: true,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 8,
    nom: 'Verre Tiki',
    contenanceCl: 50.0,
    imageUrl: 'assets/images/verres/verre_tiki.png',
    description: 'Gobelet en céramique exotique sculpté pour cocktails tropicaux.',
    isPredefined: true,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 9,
    nom: 'Verre à Shot / Chupito',
    contenanceCl: 5.0,
    imageUrl: 'assets/images/verres/verre_shot.png',
    description: 'Petit verre épais pour dégustation en une gorgée.',
    isPredefined: true,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  }
];

export const MOCK_GLASSWARE_SAMPLE: Glassware = MOCK_GLASSWARE_LIST[0];

/**
 * Creates a customized mock Glassware object.
 */
export function createMockGlassware(overrides: Partial<Glassware> = {}): Glassware {
  return {
    ...MOCK_GLASSWARE_SAMPLE,
    ...overrides
  };
}

/**
 * Creates a mock GlasswareRequest payload.
 */
export function createMockGlasswareRequest(overrides: Partial<GlasswareRequest> = {}): GlasswareRequest {
  return {
    nom: 'Verre sur mesure',
    contenanceCl: 30.0,
    imageUrl: 'assets/images/verres/verre_tumbler.png',
    description: 'Verre de test',
    isPredefined: false,
    ...overrides
  };
}
