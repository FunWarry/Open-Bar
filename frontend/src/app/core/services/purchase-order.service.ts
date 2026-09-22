import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
    if (status && status !== ('ALL' as any)) {
      params = params.set('status', status);
    }
    return this.http.get<any[]>(this.api, { params }).pipe(
      map(orders => (orders || []).map(o => this.normalizeOrder(o)))
    );
  }

  /**
   * Fetches a specific purchase order by ID.
   *
   * @param id - Numeric identifier.
   * @returns Observable emitting the purchase order.
   */
  getById(id: number): Observable<PurchaseOrder> {
    return this.http.get<any>(`${this.api}/${id}`).pipe(
      map(o => this.normalizeOrder(o))
    );
  }

  /**
   * Creates a new draft purchase order.
   *
   * @param request - Order creation payload.
   * @returns Observable emitting the created purchase order.
   */
  create(request: PurchaseOrderCreateRequest): Observable<PurchaseOrder> {
    return this.http.post<any>(this.api, request).pipe(
      map(o => this.normalizeOrder(o))
    );
  }

  /**
   * Marks a draft purchase order as sent to the supplier.
   *
   * @param id - Numeric identifier.
   * @returns Observable emitting the updated purchase order.
   */
  send(id: number): Observable<PurchaseOrder> {
    return this.http.patch<any>(`${this.api}/${id}/send`, {}).pipe(
      map(o => this.normalizeOrder(o))
    );
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
    return this.http.patch<any>(`${this.api}/${id}/cancel`, {}).pipe(
      map(o => this.normalizeOrder(o))
    );
  }

  private normalizeOrder(dto: any): PurchaseOrder {
    if (!dto) return dto;
    const rawStatus = dto.statut || dto.status || 'BROUILLON';
    let status: PurchaseOrderStatus;
    if (rawStatus === 'ORDERED' || rawStatus === 'COMMANDEE' || rawStatus === 'COMMANDE') {
      status = 'COMMANDEE';
    } else if (rawStatus === 'PARTIALLY_RECEIVED' || rawStatus === 'PARTIELLEMENT_LIVREE') {
      status = 'PARTIELLEMENT_LIVREE';
    } else if (rawStatus === 'RECEIVED' || rawStatus === 'LIVREE' || rawStatus === 'RECU') {
      status = 'LIVREE';
    } else if (rawStatus === 'CANCELLED' || rawStatus === 'ANNULEE') {
      status = 'ANNULEE';
    } else {
      status = 'BROUILLON';
    }

    const order: PurchaseOrder = {
      ...dto,
      id: dto.id,
      numeroCommande: dto.numeroCommande || dto.reference || `CMD-2026-${String(dto.id).padStart(3, '0')}`,
      status,
      totalHt: dto.totalHt ?? 0,
      totalTva: dto.totalTva ?? 0,
      totalTtc: dto.totalTtc ?? 0,
      items: dto.items || []
    };

    if (dto.supplierId !== undefined) order.supplierId = dto.supplierId;
    if (dto.supplierNom !== undefined) order.supplierNom = dto.supplierNom;
    if (dto.dateCommande !== undefined) order.dateCommande = dto.dateCommande;
    if (dto.dateLivraisonPrevue !== undefined) order.dateLivraisonPrevue = dto.dateLivraisonPrevue;
    if (dto.dateLivraisonReelle !== undefined || dto.dateReception !== undefined) {
      order.dateLivraisonReelle = dto.dateLivraisonReelle ?? dto.dateReception;
    }
    if (dto.notes !== undefined) order.notes = dto.notes;
    if (dto.referenceFactureFournisseur !== undefined) order.referenceFactureFournisseur = dto.referenceFactureFournisseur;
    if (dto.createdAt !== undefined) order.createdAt = dto.createdAt;
    if (dto.updatedAt !== undefined) order.updatedAt = dto.updatedAt;

    return order;
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
