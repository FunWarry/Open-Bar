/**
 * Lifecycle status of an imported digital supplier invoice.
 */
export type SupplierInvoiceStatus =
  | 'PENDING_REVIEW'
  | 'RECONCILED'
  | 'DISCREPANCY_CONFIRMED'
  | 'APPLIED'
  | 'REJECTED';

/**
 * Format and digital profile of the imported supplier invoice.
 */
export type SupplierInvoiceFormat = 'FACTUR_X' | 'STANDARD_PDF' | 'XML_DIRECT';

/**
 * French legal & tax compliance status of the imported invoice.
 */
export type SupplierInvoiceComplianceStatus = 'COMPLIANT' | 'WARNINGS' | 'NON_COMPLIANT';

/**
 * Comparison status between an individual invoice line item and a purchase order / inventory ingredient.
 */
export type InvoiceItemReconciliationStatus =
  | 'MATCHED'
  | 'PRICE_VARIANCE'
  | 'QUANTITY_VARIANCE'
  | 'UNEXPECTED_ITEM'
  | 'MISSING_ORDER_ITEM'
  | 'UNRECOGNIZED_INGREDIENT';

/**
 * Individual product line item extracted from a supplier invoice.
 */
export interface SupplierInvoiceItem {
  id: number;
  lineNumber: number;
  productReference?: string;
  designation: string;
  packaging?: string;
  quantityInvoiced: number;
  unitPriceHt: number;
  discountAmount?: number;
  vatRate: number;
  lineTotalHt: number;
  lineTotalTtc: number;
  matchedIngredientId?: number;
  matchedIngredientName?: string;
  matchedPoItemId?: number;
  reconciliationStatus: InvoiceItemReconciliationStatus;
  varianceDetails?: string;
  suggestedPackagingCapacity?: number;
  effectiveReceivedQuantity?: number;
  effectiveUnitPriceHt?: number;
}

/**
 * Digital supplier invoice with extracted metadata and line items.
 */
export interface SupplierInvoice {
  id: number;
  invoiceNumber: string;
  supplierId?: number;
  supplierName?: string;
  supplierNameRaw?: string;
  supplierSiren?: string;
  supplierSiret?: string;
  supplierVatNumber?: string;
  customerName?: string;
  customerSiren?: string;
  invoiceDate?: string;
  dueDate?: string;
  deliveryDate?: string;
  orderReference?: string;
  deliveryNoteReference?: string;
  totalHt: number;
  totalVat: number;
  totalTtc: number;
  currency: string;
  status: SupplierInvoiceStatus;
  format: SupplierInvoiceFormat;
  profile?: string;
  fileName?: string;
  fileChecksum?: string;
  legalComplianceStatus: SupplierInvoiceComplianceStatus;
  complianceDetails?: string;
  reconciliationNotes?: string;
  purchaseOrderId?: number;
  purchaseOrderReference?: string;
  deliveryId?: number;
  reviewedById?: number;
  reviewedByUsername?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  items: SupplierInvoiceItem[];
}

/**
 * Response payload returned after uploading and parsing a supplier invoice file.
 */
export interface SupplierInvoiceUploadResponse {
  invoice: SupplierInvoice;
  duplicate: boolean;
  message: string;
  warnings: string[];
}

/**
 * Line item adjustment or mapping payload sent during reconciliation.
 */
export interface SupplierInvoiceItemReconcileAdjustment {
  itemId: number;
  matchedIngredientId?: number;
  matchedPoItemId?: number;
  effectiveReceivedQuantity?: number;
  effectiveUnitPriceHt?: number;
  packagingCapacity?: number;
}

/**
 * Payload sent to save reconciliation adjustments or associate with a purchase order.
 */
export interface SupplierInvoiceReconcileRequest {
  purchaseOrderId?: number;
  reconciliationNotes?: string;
  itemAdjustments: SupplierInvoiceItemReconcileAdjustment[];
}

/**
 * Line-level reconciliation diff between an invoiced line and a purchase order item.
 */
export interface ReconciliationLineDiff {
  invoiceItemId?: number;
  lineNumber?: number;
  designation: string;
  productReference?: string;
  packaging?: string;
  quantityInvoiced: number;
  quantityOrdered: number;
  quantityDelivered: number;
  quantityVariance: number;
  unitPriceInvoiced: number;
  unitPriceOrdered: number;
  priceVarianceAmount: number;
  priceVariancePercent: number;
  status: InvoiceItemReconciliationStatus;
  matchedIngredientId?: number;
  matchedIngredientName?: string;
  matchedPoItemId?: number;
  isNewOrUnrecognized: boolean;
  varianceDetails?: string;
}

/**
 * Detailed reconciliation snapshot between invoice and candidate purchase orders.
 */
export interface SupplierInvoiceReconciliation {
  invoiceId: number;
  invoiceNumber: string;
  supplierId?: number;
  supplierName?: string;
  selectedPurchaseOrderId?: number;
  selectedPurchaseOrderReference?: string;
  selectedPurchaseOrderStatus?: string;
  invoicedTotalHt: number;
  orderedTotalHt: number;
  totalHtVariance: number;
  status: SupplierInvoiceStatus;
  candidatePurchaseOrders: Array<{
    id: number;
    reference: string;
    statut: string;
    totalHt: number;
    totalTtc: number;
    dateCommande: string;
  }>;
  lines: ReconciliationLineDiff[];
  canAutoApply: boolean;
  reconciliationWarnings: string[];
}

/**
 * French legal & tax compliance report for an imported invoice.
 */
export interface SupplierInvoiceComplianceReport {
  status: SupplierInvoiceComplianceStatus;
  hasMandatoryLegalMentions: boolean;
  hasValidSiren: boolean;
  hasValidVatBreakdown: boolean;
  isMathConsistent: boolean;
  complianceIssues: string[];
  complianceWarnings: string[];
}
