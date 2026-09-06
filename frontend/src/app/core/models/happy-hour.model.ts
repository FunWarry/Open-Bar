/**
 * Supported promotional discount calculation strategies.
 */
export type DiscountType = 'PERCENTAGE' | 'FIXED_PRICE' | 'FIXED_DISCOUNT';

/**
 * Days of the week in standard ISO English.
 */
export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

/**
 * Promotional Happy Hour and dynamic pricing rule entity representation.
 */
export interface HappyHourRule {
  id: number;
  name: string;
  startTime: string; // 'HH:mm' or 'HH:mm:ss'
  endTime: string;   // 'HH:mm' or 'HH:mm:ss'
  daysOfWeek: DayOfWeek[];
  discountType: DiscountType;
  discountValue: number;
  active: boolean;
  categories: string[];
  cocktailIds: number[];
  isActiveNow?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Request payload for creating or updating a Happy Hour rule.
 */
export interface HappyHourRuleRequest {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[];
  discountType: DiscountType;
  discountValue: number;
  active: boolean;
  categories: string[];
  cocktailIds: number[];
}

/**
 * Live drink price simulation result.
 */
export interface PricingPreviewResult {
  cocktailId: number;
  cocktailNom: string;
  varianteId?: number | null;
  varianteNom?: string | null;
  basePrice: number;
  effectivePrice: number;
  discountAmount: number;
  discountPercentage: number;
  isHappyHour: boolean;
  appliedRuleId?: number | null;
  appliedRuleName?: string | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  evaluatedAt?: string;
}
