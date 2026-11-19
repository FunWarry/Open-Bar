import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SupplierInvoice,
  SupplierInvoiceStatus,
  SupplierInvoiceUploadResponse,
  SupplierInvoiceReconcileRequest,
  SupplierInvoiceReconciliation,
  SupplierInvoiceComplianceReport
} from '../models/supplier-invoice.model';

/**
 * Service managing supplier invoice digital intake, Factur-X XML and PDF parsing,
 * electronic compliance reporting, and purchase order reconciliation.
 */
@Injectable({
  providedIn: 'root'
})
export class SupplierInvoiceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/purchases/invoices`;

  /**
   * Uploads and parses a supplier invoice file (Factur-X hybrid PDF or direct XML).
   *
   * @param file Invoice file to upload
   * @returns Observable with parsing result and extracted invoice data
   */
  uploadInvoice(file: File): Observable<SupplierInvoiceUploadResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<SupplierInvoiceUploadResponse>(`${this.baseUrl}/upload`, formData);
  }

  /**
   * Retrieves all imported supplier invoices with optional status and supplier filtering.
   *
   * @param status Optional lifecycle status filter
   * @param supplierId Optional supplier ID filter
   * @returns Observable with list of matching supplier invoices
   */
  getInvoices(status?: SupplierInvoiceStatus, supplierId?: number): Observable<SupplierInvoice[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (supplierId) {
      params = params.set('supplierId', supplierId.toString());
    }
    return this.http.get<SupplierInvoice[]>(this.baseUrl, { params });
  }

  /**
   * Retrieves a single supplier invoice with line items by its identifier.
   *
   * @param id Invoice identifier
   * @returns Observable with supplier invoice details
   */
  getInvoiceById(id: number): Observable<SupplierInvoice> {
    return this.http.get<SupplierInvoice>(`${this.baseUrl}/${id}`);
  }

  /**
   * Computes a detailed reconciliation comparison diff between an invoice and candidate purchase orders.
   *
   * @param id Invoice identifier
   * @param purchaseOrderId Optional target purchase order identifier
   * @returns Observable with reconciliation comparison snapshot
   */
  getReconciliationPreview(id: number, purchaseOrderId?: number): Observable<SupplierInvoiceReconciliation> {
    let params = new HttpParams();
    if (purchaseOrderId) {
      params = params.set('purchaseOrderId', purchaseOrderId.toString());
    }
    return this.http.get<SupplierInvoiceReconciliation>(`${this.baseUrl}/${id}/reconcile-preview`, { params });
  }

  /**
   * Saves manual reconciliation adjustments and associates the invoice with a purchase order.
   *
   * @param id Invoice identifier
   * @param request Reconciliation adjustments payload
   * @returns Observable with updated supplier invoice
   */
  reconcileInvoice(id: number, request: SupplierInvoiceReconcileRequest): Observable<SupplierInvoice> {
    return this.http.post<SupplierInvoice>(`${this.baseUrl}/${id}/reconcile`, request);
  }

  /**
   * Approves the supplier invoice, automatically generating delivery receipts,
   * replenishing stock quantities, and recalculating Weighted Average Unit Costs (PAMP/WAC).
   *
   * @param id Invoice identifier
   * @returns Observable with applied supplier invoice
   */
  applyInvoice(id: number): Observable<SupplierInvoice> {
    return this.http.post<SupplierInvoice>(`${this.baseUrl}/${id}/apply`, {});
  }

  /**
   * Generates a French legal & tax compliance verification report for the invoice.
   *
   * @param id Invoice identifier
   * @returns Observable with compliance audit report
   */
  getComplianceReport(id: number): Observable<SupplierInvoiceComplianceReport> {
    return this.http.get<SupplierInvoiceComplianceReport>(`${this.baseUrl}/${id}/compliance`);
  }

  /**
   * Downloads the raw embedded Factur-X XML data document.
   *
   * @param id Invoice identifier
   * @returns Observable with XML file blob
   */
  downloadXml(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/download-xml`, { responseType: 'blob' });
  }

  /**
   * Deletes a draft or rejected supplier invoice.
   *
   * @param id Invoice identifier
   * @returns Observable completing when deleted
   */
  deleteInvoice(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
