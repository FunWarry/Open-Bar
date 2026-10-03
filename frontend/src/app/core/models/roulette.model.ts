/**
 * Types of prizes awarded by the cocktail roulette wheel.
 */
export type RoulettePrizeType = 'COCKTAIL' | 'BARTENDER_SPECIAL' | 'SHOOTER' | 'CUSTOM_REWARD';

/**
 * Bias levels for stock depletion weighting.
 */
export type RouletteStockBias = 'EQUAL' | 'BALANCED' | 'AGGRESSIVE';

/**
 * Single sector / slice on the Cocktail Roulette Wheel.
 */
export interface RouletteWheelSector {
  id: number;
  label: string;
  prizeType: RoulettePrizeType;
  cocktailId?: number | null;
  cocktailNom?: string | null;
  cocktailImageUrl?: string | null;
  rewardText?: string | null;
  prix?: number | null;
  colorHex?: string | null;
  iconName?: string | null;
  probabilityWeight: number;
  active: boolean;
  displayOrder: number;
}

/**
 * Payload for requesting a spin from mobile customer view or server cart.
 */
export interface RouletteSpinRequest {
  tableId?: number | null;
  guestSessionId?: string | null;
  guestName?: string | null;
  spiritCategory?: string | null;
  nonAlcoholicOnly?: boolean;
  excludedAllergens?: string[] | null;
  autoAddToCart?: boolean;
}

/**
 * Outcome returned after resolving a roulette spin.
 */
export interface RouletteSpinResult {
  sectorId: number;
  winningIndex: number;
  prizeType: RoulettePrizeType;
  cocktailId?: number | null;
  cocktailNom?: string | null;
  cocktailDescription?: string | null;
  cocktailImageUrl?: string | null;
  prix: number;
  rewardText?: string | null;
  barmanNotes?: string | null;
  isMysteryDrink: boolean;
  addedToCart: boolean;
  activeSectors: RouletteWheelSector[];
}

/**
 * Bartender request for triggering a live synchronized broadcast spin.
 */
export interface RouletteBroadcastSpinRequest {
  tableId?: number | null;
  mode: 'RANDOM' | 'CATEGORY' | 'RIGGED_SECTOR' | 'RIGGED_COCKTAIL';
  spiritCategory?: string | null;
  riggedSectorId?: number | null;
  riggedCocktailId?: number | null;
  autoAddToCart?: boolean;
  durationSeconds?: number;
  soundProfile?: string;
}

/**
 * Real-time event received from STOMP topic `/topic/roulette/events`.
 */
export interface RouletteEvent {
  eventType: 'SPIN_TRIGGERED' | 'SPIN_COMPLETED' | 'SECTORS_UPDATED' | 'PIN_REVOKED';
  eventId: string;
  tableId?: number | null;
  tableNumero?: number | null;
  spinResult?: RouletteSpinResult | null;
  durationMs: number;
  soundProfile: string;
  timestamp: string;
}

/**
 * Public configuration and active sectors for the roulette.
 */
export interface RoulettePublicConfig {
  enabled: boolean;
  priceCocktail: number;
  priceMocktail: number;
  stockBias: string;
  soundProfile: string;
  sectors: RouletteWheelSector[];
  availableCategories: string[];
}

/**
 * Staff 4-digit PIN representation.
 */
export interface RoulettePin {
  pin: string;
}

/**
 * Verification outcome for TV display PIN unlock.
 */
export interface RoulettePinVerification {
  valid: boolean;
}
