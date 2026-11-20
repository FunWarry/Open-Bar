/**
 * Dual-tier TPE payment monetization tiers.
 */
export type TpeMonetizationTier = 'CONCERT_IP_OFFLINE' | 'STRIPE_TERMINAL_CONNECT';

/**
 * Originating card payment channel for a ledger entry.
 */
export type CardCommissionSource = 'CONCERT_IP_TPE' | 'MANUAL_CB' | 'STRIPE_TERMINAL_CONNECT';

/**
 * Settlement and billing lifecycle status for a ledger entry.
 */
export type CardCommissionStatus =
  | 'ACCUMULATED'
  | 'SYNCED_ONLINE'
  | 'EXPORTED_OFFLINE'
  | 'SETTLED_AT_SOURCE'
  | 'INVOICED_PENDING';

/**
 * Monthly commission invoice billing status.
 */
export type CommissionInvoiceStatus = 'NONE' | 'PENDING' | 'GRACE_PERIOD' | 'OVERDUE' | 'SETTLED';

/**
 * Effective commission rate schedule for Option 1 vs Option 3.
 */
export interface CommissionTierRates {
  activeTier: TpeMonetizationTier;
  option1RateBps: number;
  option1FixedCents: number;
  option3RateBps: number;
  option3FixedCents: number;
  tpeHardwareMode: string;
  stripeTerminalModuleEnabled: boolean;
  stripeConnectAccountConfigured: boolean;
}

/**
 * Single immutable SHA-256 hash-chained card commission ledger entry.
 */
export interface CardCommissionLedgerEntry {
  id: number;
  sequenceNumber: number;
  billingPeriod: string;
  establishmentId: string;
  factureId: number | null;
  reglementId: number | null;
  invoiceNumber: string | null;
  externalTransactionId: string | null;
  tpeAuthorizationCode: string | null;
  tpeTerminalId: string | null;
  cardBrand: string | null;
  maskedPan: string | null;
  tier: TpeMonetizationTier;
  source: CardCommissionSource;
  status: CardCommissionStatus;
  grossAmount: number;
  rateBps: number;
  fixedFeeCents: number;
  commissionAmount: number;
  currency: string;
  previousHash: string;
  entryHash: string;
  recordedAt: string;
  syncedAt: string | null;
}

/**
 * Cryptographic SHA-256 chain integrity verification report.
 */
export interface LedgerVerificationResult {
  valid: boolean;
  totalEntries: number;
  verifiedEntries: number;
  tipHash: string;
  brokenSequenceNumber: number | null;
  message: string;
}

/**
 * Lightweight monetization and commission grace-period summary for staff banners and POS guards.
 */
export interface MonetizationSummary {
  activeTier: TpeMonetizationTier;
  billingPeriod: string;
  invoiceStatus: CommissionInvoiceStatus;
  remoteInvoiceId: string | null;
  pendingAmount: number;
  graceEndsAt: string | null;
  graceHoursRemaining: number;
  enforceGraceLock: boolean;
  tpeCardLocked: boolean;
  shouldShowBanner: boolean;
}

/**
 * Historical monthly commission billing summary item.
 */
export interface BillingPeriodItem {
  billingPeriod: string;
  activeTier: TpeMonetizationTier;
  option1Volume: number;
  option1Count: number;
  option1Commission: number;
  option3Volume: number;
  option3Count: number;
  option3Commission: number;
  totalCommissionDue: number;
  invoiceStatus: CommissionInvoiceStatus;
  remoteInvoiceId: string | null;
  pendingAmount: number;
  graceEndsAt: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastExportedAt: string | null;
  settledAt: string | null;
}

/**
 * Complete administrative dashboard payload for dual-tier TPE monetization.
 */
export interface MonetizationDashboard {
  billingPeriod: string;
  venueEstablishmentId: string;
  rates: CommissionTierRates;
  summary: MonetizationSummary;
  option1Volume: number;
  option1Count: number;
  option1Commission: number;
  option3Volume: number;
  option3Count: number;
  option3Commission: number;
  totalCommissionDue: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  lastExportedAt: string | null;
  integrity: LedgerVerificationResult;
  entries: CardCommissionLedgerEntry[];
  billingHistory: BillingPeriodItem[];
}

/**
 * Certified daily Z-report digest embedded inside monthly offline commission proof bundles.
 */
export interface ZReportDigest {
  closureNumber: string;
  closureDate: string;
  totalRevenueTTC: number;
  sha256Hash: string;
}

/**
 * Signed offline monthly Z-report & card commission proof bundle for openbar.fr portal renewal.
 */
export interface MonthlyCommissionProof {
  billingPeriod: string;
  establishmentId: string;
  generatedAt: string;
  option1Volume: number;
  option1Count: number;
  option1Commission: number;
  option3Volume: number;
  option3Count: number;
  option3Commission: number;
  totalCommissionDue: number;
  startLedgerHash: string;
  endLedgerHash: string;
  ledgerChainValid: boolean;
  zReports: ZReportDigest[];
  canonicalPayloadDigest: string;
  hmacSignature: string;
  compactProofToken: string;
}

/**
 * Result of an online commission ledger synchronization with central Stripe Billing.
 */
export interface CommissionSyncResult {
  synced: boolean;
  onlineReachable: boolean;
  syncStatus: string;
  syncedEntriesCount: number;
  message: string;
  summary: MonetizationSummary;
}

/**
 * Stripe Terminal SDK ConnectionToken payload for Option 3 smart Android readers.
 */
export interface StripeTerminalConnectionToken {
  secret: string;
  simulator: boolean;
  readerId: string | null;
  locationId: string | null;
}
