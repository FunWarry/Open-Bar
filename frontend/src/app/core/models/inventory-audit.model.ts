/**
 * Lifecycle status of a periodic physical stock inventory audit.
 */
export type InventoryAuditStatus = 'DRAFT' | 'IN_PROGRESS' | 'FINALIZED' | 'CANCELLED';

/**
 * Storage location count entry for an ingredient line item.
 */
export interface InventoryAuditLocationCount {
  id?: number;
  storageLocation: string;
  fullContainersCount: number;
  partialQuantity: number;
  countedQuantity: number;
  notes?: string;
  countedAt?: string;
  countedByUsername?: string;
}

/**
 * Audited ingredient line item with theoretical snapshot and physical counts.
 */
export interface InventoryAuditItem {
  id: number;
  ingredientId: number;
  ingredientNom: string;
  ingredientUnite: string;
  ingredientCategory: string;
  packagingCapacity?: number;
  theoreticalQuantity: number;
  countedQuantity: number | null;
  varianceQuantity: number;
  unitCostHt: number;
  theoreticalValueHt: number;
  countedValueHt: number;
  varianceValueHt: number;
  notes?: string;
  locationCounts: InventoryAuditLocationCount[];
}

/**
 * Full inventory audit session entity.
 */
export interface InventoryAuditSession {
  id: number;
  referenceCode: string;
  title: string;
  status: InventoryAuditStatus;
  storageLocationScope: string;
  categoryScope?: string;
  createdByUsername?: string;
  finalizedByUsername?: string;
  createdAt: string;
  startedAt?: string;
  finalizedAt?: string;
  notes?: string;
  totalTheoreticalValueHt: number;
  totalCountedValueHt: number;
  totalVarianceValueHt: number;
  totalItemsCount: number;
  countedItemsCount: number;
  items?: InventoryAuditItem[];
}

/**
 * Request payload for creating a new audit session.
 */
export interface CreateInventoryAuditSessionRequest {
  title: string;
  storageLocationScope?: string;
  categoryScope?: string;
  notes?: string;
}

/**
 * Request payload for updating an item count at a specific storage location.
 */
export interface UpdateInventoryAuditItemCountRequest {
  storageLocation: string;
  fullContainersCount: number;
  partialQuantity: number;
  notes?: string;
}

/**
 * Individual entry for batch update.
 */
export interface BatchItemCountEntry {
  auditItemId: number;
  storageLocation: string;
  fullContainersCount: number;
  partialQuantity: number;
  notes?: string;
}

/**
 * Request payload for bulk saving counts.
 */
export interface BatchUpdateItemCountsRequest {
  counts: BatchItemCountEntry[];
}

/**
 * Consolidated variance and shrinkage metrics.
 */
export interface InventoryVarianceSummary {
  totalTheoreticalValueHt: number;
  totalCountedValueHt: number;
  totalVarianceValueHt: number;
  totalShrinkageValueHt: number;
  totalSurplusValueHt: number;
  totalItemsAudited: number;
  itemsWithVarianceCount: number;
  varianceValueByCategory: Record<string, number>;
  countedValueByLocation: Record<string, number>;
}
