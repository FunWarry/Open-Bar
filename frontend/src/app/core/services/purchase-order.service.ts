import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PriceVariation,
  PurchaseOrder,
  PurchaseOrderCreateRequest,
  PurchaseOrderReceptionRequest,
  PurchaseOrderStatus
} from '../models/purchase-order.model';

/**
 * Service managing supplier purchase orders, delivery receipts, and PDF generation.
 */
@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private readonly api = `${environment.apiUrl}/purchase-orders`;
  private readonly http = inject(HttpClient);

  /**
   * Fetches all purchase orders, optionally filtered by status.
   *
   * @param status - Optional status filter.
   * @returns Observable emitting an array of purchase orders.
   */
  getAll(status?: PurchaseOrderStatus): Observable<PurchaseOrder[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<PurchaseOrder[]>(this.api, { params });
  }

  /**
   * Fetches a specific purchase order by ID.
   *
   * @param id - Numeric identifier.
   * @returns Observable emitting the purchase order.
   */
  getById(id: number): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.api}/${id}`);
  }

  /**
   * Creates a new draft purchase order.
   *
   * @param request - Order creation payload.
   * @returns Observable emitting the created purchase order.
   */
  create(request: PurchaseOrderCreateRequest): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.api, request);
  }

  /**
   * Marks a draft purchase order as sent to the supplier.
   *
   * @param id - Numeric identifier.
   * @returns Observable emitting the updated purchase order.
   */
  send(id: number): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.api}/${id}/send`, {});
  }

  /**
   * Records receipt of goods against a purchase order and updates PAMP and stock levels.
   *
   * @param id - Numeric identifier of the purchase order.
   * @param reception - Delivery check-in details.
   * @returns Observable emitting price variations for affected ingredients.
   */
  receive(id: number, reception: PurchaseOrderReceptionRequest): Observable<PriceVariation[]> {
    return this.http.post<PriceVariation[]>(`${this.api}/${id}/receive`, reception);
  }

  /**
   * Cancels a draft or sent purchase order.
   *
   * @param id - Numeric identifier.
   * @returns Observable emitting the cancelled purchase order.
   */
  cancel(id: number): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.api}/${id}/cancel`, {});
  }

  /**
   * Downloads or fetches the generated purchase order PDF blob.
   *
   * @param id - Numeric identifier.
   * @returns Observable emitting the PDF file Blob.
   */
  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
