import { PaymentModeSummary, VatSummary } from './daily-recap.model';

/**
 * Breakdown of physically counted coin and bill quantities.
 */
export interface CashCountingBreakdown {
  bill50?: number;
  bill20?: number;
  bill10?: number;
  bill5?: number;
  coin2?: number;
  coin1?: number;
  coin050?: number;
  coin020?: number;
  coin010?: number;
  coin005?: number;
  coin002?: number;
  coin001?: number;
  [key: string]: number | undefined;
}

/**
 * Request payload to execute an end-of-day register closure (Z-Report).
 */
export interface ClotureCaisseRequest {
  date?: string;
  openingFloat: number;
  countedCash: number;
  countingBreakdown?: Record<string, number>;
  discrepancyReason?: string;
}

/**
 * Certified daily cash register closure record (Z-Report).
 */
export interface DailyCashClosure {
  id: number;
  closureNumber: string;
  closureDate: string;
  openingFloat: number;
  theoreticalCash: number;
  countedCash: number;
  cashDiscrepancy: number;
  totalRevenueHT: number;
  totalRevenueTTC: number;
  vatBreakdownJson?: string;
  paymentMethodsJson?: string;
  countingBreakdownJson?: string;
  discrepancyReason?: string;
  closedByUsername?: string;
  closedByName?: string;
  sha256Hash: string;
  createdAt: string;
  updatedAt: string;
}
