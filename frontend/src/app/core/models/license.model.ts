/**
 * Operational states of the venue's OpenBar license.
 */
export type LicenseStatus =
  | 'VALID'
  | 'GRACE_PERIOD'
  | 'EXPIRED'
  | 'UNLICENSED'
  | 'COMMUNITY'
  | 'INVALID';

/**
 * Supported subscription plan tiers.
 */
export type LicensePlan = 'COMMUNITY' | 'ESSENTIAL' | 'PRO' | 'ENTERPRISE';

/**
 * Detailed administrative license diagnostics and entitlement payload.
 */
export interface LicenseStatusInfo {
  status: LicenseStatus;
  plan: string | null;
  establishmentId: string | null;
  venueEstablishmentId: string;
  issuedAt: string | null;
  expiresAt: string | null;
  graceEndsAt: string | null;
  daysRemaining: number;
  graceHoursRemaining: number;
  licensedModules: string[];
  allModulesLicensed: boolean;
  orderCreationAllowed: boolean;
  enforced: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string;
  lastSyncError: string | null;
  activationMode: string;
  activatedBy: string | null;
  publicKeyFingerprint: string;
  maskedToken: string | null;
}

/**
 * Lightweight license status summary for authenticated staff warning banners.
 */
export interface LicenseSummaryInfo {
  status: LicenseStatus;
  plan: string | null;
  expiresAt: string | null;
  graceEndsAt: string | null;
  graceHoursRemaining: number;
  orderCreationAllowed: boolean;
  enforced: boolean;
}

/**
 * Payload returned when manually or automatically syncing license status online.
 */
export interface LicenseSyncResult {
  synced: boolean;
  reachable: boolean;
  syncStatus: string;
  message: string;
  license: LicenseStatusInfo;
}
