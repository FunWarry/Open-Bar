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

/**
 * Real-time active Happy Hour countdown state.
 */
export interface ActiveCountdownInfo {
  /** Applied rule triggering the countdown. */
  rule: HappyHourRule;
  /** Remaining duration in seconds. */
  remainingSeconds: number;
  /** Human-readable formatted duration (e.g. "24:15" or "01:10:05"). */
  formattedTime: string;
  /** Transloco translation key describing the affected scope. */
  scopeDescriptionKey: string;
  /** Optional interpolation parameters for translation key. */
  scopeDescriptionParams?: Record<string, unknown>;
}

/**
 * Upcoming Happy Hour promotional teaser state.
 */
export interface UpcomingTeaserInfo {
  /** Scheduled rule to start within 60 minutes. */
  rule: HappyHourRule;
  /** Minutes remaining before promotion window starts. */
  minutesUntilStart: number;
  /** Transloco translation key describing the affected scope. */
  scopeDescriptionKey: string;
  /** Optional interpolation parameters for translation key. */
  scopeDescriptionParams?: Record<string, unknown>;
}

/**
 * Event payload emitted upon Happy Hour real-time state transition.
 */
export interface HappyHourStateTransition {
  /** Transition direction. */
  type: 'STARTED' | 'ENDED';
  /** Target rule when starting. */
  rule?: HappyHourRule;
}
