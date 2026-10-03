import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BatchUpdateItemCountsRequest,
  CreateInventoryAuditSessionRequest,
  InventoryAuditItem,
  InventoryAuditSession,
  InventoryVarianceSummary,
  UpdateInventoryAuditItemCountRequest
} from '../models/inventory-audit.model';

/**
 * Service managing communication with the backend Inventory Audit REST API.
 */
@Injectable({
  providedIn: 'root'
})
export class InventoryAuditService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/inventory-audits`;

  /**
   * Retrieves all inventory audit sessions ordered chronologically.
   *
   * @returns Observable of audit session list
   */
  getAllSessions(): Observable<InventoryAuditSession[]> {
    return this.http.get<InventoryAuditSession[]>(this.baseUrl);
  }

  /**
   * Retrieves complete audit session details including all ingredient lines and location counts.
   *
   * @param id Identifier of the audit session
   * @returns Observable of audit session details
   */
  getSessionById(id: number): Observable<InventoryAuditSession> {
    return this.http.get<InventoryAuditSession>(`${this.baseUrl}/${id}`);
  }

  /**
   * Creates a new periodic physical inventory audit session in DRAFT state.
   *
   * @param request Creation parameters
   * @returns Observable of created session
   */
  createSession(request: CreateInventoryAuditSessionRequest): Observable<InventoryAuditSession> {
    return this.http.post<InventoryAuditSession>(this.baseUrl, request);
  }

  /**
   * Starts counting for an audit session, transitioning it to IN_PROGRESS.
   *
   * @param id Identifier of the audit session
   * @returns Observable of updated session
   */
  startSession(id: number): Observable<InventoryAuditSession> {
    return this.http.post<InventoryAuditSession>(`${this.baseUrl}/${id}/start`, {});
  }

  /**
   * Updates physical count quantities for an audited ingredient at a designated storage location.
   *
   * @param sessionId Identifier of the audit session
   * @param itemId Identifier of the line item
   * @param request Count update payload
   * @returns Observable of updated line item
   */
  updateItemCount(
    sessionId: number,
    itemId: number,
    request: UpdateInventoryAuditItemCountRequest
  ): Observable<InventoryAuditItem> {
    return this.http.put<InventoryAuditItem>(`${this.baseUrl}/${sessionId}/items/${itemId}`, request);
  }

  /**
   * Bulk updates multiple inventory count sheet rows in a single batch call.
   *
   * @param sessionId Identifier of the audit session
   * @param request Batch payload
   * @returns Observable of updated session
   */
  batchUpdateCounts(
    sessionId: number,
    request: BatchUpdateItemCountsRequest
  ): Observable<InventoryAuditSession> {
    return this.http.post<InventoryAuditSession>(`${this.baseUrl}/${sessionId}/items/batch`, request);
  }

  /**
   * Finalizes an audit session, reconciling active inventory balances and committing shrinkage movements.
   *
   * @param id Identifier of the audit session
   * @returns Observable of finalized session
   */
  finalizeSession(id: number): Observable<InventoryAuditSession> {
    return this.http.post<InventoryAuditSession>(`${this.baseUrl}/${id}/finalize`, {});
  }

  /**
   * Cancels an audit session without modifying active inventory balances.
   *
   * @param id Identifier of the audit session
   * @returns Observable of cancelled session
   */
  cancelSession(id: number): Observable<InventoryAuditSession> {
    return this.http.post<InventoryAuditSession>(`${this.baseUrl}/${id}/cancel`, {});
  }

  /**
   * Retrieves aggregated variance, shrinkage loss, and surplus gain metrics for an audit session.
   *
   * @param id Identifier of the audit session
   * @returns Observable of variance summary
   */
  getVarianceSummary(id: number): Observable<InventoryVarianceSummary> {
    return this.http.get<InventoryVarianceSummary>(`${this.baseUrl}/${id}/summary`);
  }

  /**
   * Downloads the printable A4 audit report and variance matrix as a PDF blob.
   *
   * @param id Identifier of the audit session
   * @returns Observable emitting binary PDF Blob
   */
  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/export/pdf`, { responseType: 'blob' });
  }

  /**
   * Downloads the audit variance matrix as an RFC-4180 CSV blob.
   *
   * @param id Identifier of the audit session
   * @returns Observable emitting CSV text Blob
   */
  downloadCsv(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/export/csv`, { responseType: 'blob' });
  }
}
