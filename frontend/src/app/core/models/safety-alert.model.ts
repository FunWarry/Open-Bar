/**
 * Enumeration of Angel Shot emergency assistance variants.
 */
export type SafetyAlertType = 'ANGEL_SHOT_NEAT' | 'ANGEL_SHOT_ICE' | 'ANGEL_SHOT_LIME';

/**
 * Lifecycle status of a safety alert.
 */
export type SafetyAlertStatus = 'ACTIVE' | 'RESOLVED';

/**
 * Model representing an Angel Shot patron emergency alert.
 */
export interface SafetyAlert {
  id: number;
  tableId: number;
  tableNumero: number;
  type: SafetyAlertType;
  typeLabel: string;
  status: SafetyAlertStatus;
  comment?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

/**
 * Request payload for triggering a silent Angel Shot alert from the table QR interface.
 */
export interface SafetyAlertRequest {
  type: SafetyAlertType;
  comment?: string | null;
}

/**
 * Request payload for acknowledging and resolving an active safety alert.
 */
export interface SafetyAlertResolveRequest {
  resolvedBy?: string | null;
}

/**
 * Descriptive metadata for each Angel Shot variant code.
 */
export interface AngelShotVariantMetadata {
  type: SafetyAlertType;
  icon: string;
  titleKey: string;
  subtitleKey: string;
  actionKey: string;
  badgeClass: string;
}

export const ANGEL_SHOT_VARIANTS: AngelShotVariantMetadata[] = [
  {
    type: 'ANGEL_SHOT_NEAT',
    icon: '🥃',
    titleKey: 'CLIENT.SAFETY.NEAT_TITLE',
    subtitleKey: 'CLIENT.SAFETY.NEAT_SUBTITLE',
    actionKey: 'CLIENT.SAFETY.NEAT_ACTION',
    badgeClass: 'badge-neat',
  },
  {
    type: 'ANGEL_SHOT_ICE',
    icon: '🧊',
    titleKey: 'CLIENT.SAFETY.ICE_TITLE',
    subtitleKey: 'CLIENT.SAFETY.ICE_SUBTITLE',
    actionKey: 'CLIENT.SAFETY.ICE_ACTION',
    badgeClass: 'badge-ice',
  },
  {
    type: 'ANGEL_SHOT_LIME',
    icon: '🍋',
    titleKey: 'CLIENT.SAFETY.LIME_TITLE',
    subtitleKey: 'CLIENT.SAFETY.LIME_SUBTITLE',
    actionKey: 'CLIENT.SAFETY.LIME_ACTION',
    badgeClass: 'badge-lime',
  },
];
