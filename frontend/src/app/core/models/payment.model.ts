/**
 * Data models for patron QR mobile payment at table (Stripe Elements & Sandbox fallback).
 */

export type PaymentSplitMode = 'FULL' | 'MY_ITEMS' | 'EQUAL_SPLIT' | 'CUSTOM_AMOUNT';

/**
 * Detailed line item on a table bill.
 */
export interface TableBillItem {
  ligneId: number;
  boissonNom: string;
  quantite: number;
  prixUnitaire: number;
  totalLigne: number;
  guestName?: string | null;
  orderStatus: string;
  orderDate?: string | null;
}

/**
 * Summary of a previous partial settlement made on the table.
 */
export interface TableSettlementSummary {
  id: number;
  montant: number;
  pourboire: number;
  modePaiement: string;
  payerName?: string | null;
  dateReglement?: string | null;
  transactionId?: string | null;
}

/**
 * Live table addition breakdown for patron mobile settlement.
 */
export interface TableBillSummary {
  tableId: number;
  tableNumber: number;
  activeOrdersCount: number;
  totalItemsCount: number;
  subtotalVatExcluded: number;
  vatAmount: number;
  subtotalVatIncluded: number;
  alreadyPaidAmount: number;
  remainingBalance: number;
  isFullySettled: boolean;
  items: TableBillItem[];
  settlements: TableSettlementSummary[];
  paymentProvider: 'SANDBOX' | 'STRIPE';
  currency: string;
  stripePublishableKey?: string | null;
}

/**
 * Request payload to initiate an online payment intent.
 */
export interface PaymentIntentRequest {
  guestName?: string | null;
  email?: string | null;
  splitMode: PaymentSplitMode;
  baseAmount: number;
  tipAmount: number;
  totalAmount: number;
  splitPersonsCount?: number | null;
  selectedItemIds?: number[] | null;
  idempotencyKey?: string | null;
}

/**
 * Response payload returned after initializing a payment intent.
 */
export interface PaymentIntentResponse {
  transactionId: string;
  clientSecret: string;
  amount: number;
  tipAmount: number;
  totalAmount: number;
  currency: string;
  provider: 'SANDBOX' | 'STRIPE';
  stripePublishableKey?: string | null;
  status: string;
}

/**
 * Request payload to confirm a payment in Sandbox / Demo mode.
 */
export interface ConfirmSandboxPaymentRequest {
  transactionId: string;
  clientSecret: string;
  paymentMethodType?: string;
}

/**
 * Settlement confirmation response payload.
 */
export interface PaymentSuccessResponse {
  transactionId: string;
  status: string;
  baseAmount: number;
  tipAmount: number;
  totalAmount: number;
  currency: string;
  remainingBalance: number;
  isTableFullySettled: boolean;
  tableLiberated: boolean;
  receiptDownloadUrl?: string | null;
}

/**
 * Request payload to trigger receipt dispatch by email.
 */
export interface SendReceiptEmailRequest {
  email: string;
}

/**
 * Request payload to vacate and liberate table after full settlement.
 */
export interface LiberateTableRequest {
  tableId: number;
  guestName?: string | null;
}
