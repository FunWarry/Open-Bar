/**
 * Domain types and data contracts for cash drawer lifecycle, movements, and X-reports.
 */

export type CashDrawerSessionStatus = 'OPEN' | 'CLOSED';

export type CashMovementType = 'CASH_IN' | 'CASH_DROP' | 'PAID_OUT';

export interface DenominationBreakdown {
  denomination: number;
  count: number;
  total: number;
}

export interface UserSummary {
  id: number;
  username: string;
  nom?: string;
  prenom?: string;
}

export interface CashDrawerSession {
  id: number;
  sessionDate: string;
  openedAt: string;
  closedAt?: string | null;
  openedBy?: UserSummary | null;
  closedBy?: UserSummary | null;
  openingFloat: number;
  countedFloatAtClose?: number | null;
  theoreticalCashAtClose?: number | null;
  cashDiscrepancy?: number | null;
  status: CashDrawerSessionStatus;
  openingDenominationsJson?: string | null;
  closingDenominationsJson?: string | null;
  notes?: string | null;
}

export interface CashMovement {
  id: number;
  sessionId: number;
  type: CashMovementType;
  amount: number;
  reason: string;
  receiptReference?: string | null;
  timestamp: string;
  performedBy?: UserSummary | null;
}

export interface CashDrawerStatus {
  isModuleEnabled: boolean;
  date: string;
  hasSession: boolean;
  isOpened: boolean;
  isClosed: boolean;
  session?: CashDrawerSession | null;
  startingFloat: number;
  totalCashSales: number;
  totalCashIn: number;
  totalCashDrop: number;
  totalPaidOut: number;
  currentTheoreticalCash: number;
  totalMovementsCount: number;
}

export interface CashDrawerOpenRequest {
  openingFloat: number;
  denominationsJson?: string;
  notes?: string;
}

export interface CashMovementRequest {
  type: CashMovementType;
  amount: number;
  reason: string;
  receiptReference?: string;
}

export interface XReportPaymentModeSummary {
  modePaiement: string;
  count: number;
  totalTtc: number;
}

export interface XReportVatSummary {
  taux: number;
  tauxLabel: string;
  baseHt: number;
  montantTva: number;
  totalTtc: number;
}

export interface XReport {
  reportDate: string;
  generatedAt: string;
  generatedBy: string;
  openingFloat: number;
  totalRevenueTTC: number;
  totalRevenueHT: number;
  totalCashRevenue: number;
  totalCashIn: number;
  totalCashDrop: number;
  totalPaidOut: number;
  theoreticalCashInDrawer: number;
  movements: CashMovement[];
  ventilationModePaiement: XReportPaymentModeSummary[];
  ventilationTva: XReportVatSummary[];
}
