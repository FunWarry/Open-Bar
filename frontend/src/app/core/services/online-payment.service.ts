import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ConfirmSandboxPaymentRequest,
  LiberateTableRequest,
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentSuccessResponse,
  SendReceiptEmailRequest,
  TableBillSummary,
} from '../models/payment.model';

/**
 * Service managing patron pay-at-table mobile settlements, online payment intents,
 * Sandbox confirmations, digital receipts, and automatic table liberation.
 */
@Injectable({ providedIn: 'root' })
export class OnlinePaymentService {
  private readonly http = inject(HttpClient);
  private readonly publicBaseUrl = `${environment.apiUrl}/public/tables`;

  /**
   * Retrieves live bill summary, active lines, and already paid settlements for a given table.
   *
   * @param tableId Unique identifier of the table.
   * @param guestName Optional guest nickname for auto-selection of personal drinks.
   * @returns Observable of TableBillSummary.
   */
  getTableBill(tableId: number, guestName?: string): Observable<TableBillSummary> {
    let params = new HttpParams();
    if (guestName && guestName.trim().length > 0) {
      params = params.set('guestName', guestName.trim());
    }
    return this.http.get<TableBillSummary>(`${this.publicBaseUrl}/${tableId}/payments/bill`, { params });
  }

  /**
   * Initiates an online payment intent with the server for a specific amount and split mode.
   *
   * @param tableId Unique identifier of the table.
   * @param request Payment intent parameters including base amount, tip, and split details.
   * @returns Observable of PaymentIntentResponse with clientSecret.
   */
  createPaymentIntent(tableId: number, request: PaymentIntentRequest): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${this.publicBaseUrl}/${tableId}/payments/intent`, request);
  }

  /**
   * Confirms a transaction executed via the Sandbox local payment gateway simulator.
   *
   * @param tableId Unique identifier of the table.
   * @param request Confirmation payload with transactionId, clientSecret, and mock method.
   * @returns Observable of PaymentSuccessResponse.
   */
  confirmSandboxPayment(tableId: number, request: ConfirmSandboxPaymentRequest): Observable<PaymentSuccessResponse> {
    return this.http.post<PaymentSuccessResponse>(`${this.publicBaseUrl}/${tableId}/payments/confirm-sandbox`, request);
  }

  /**
   * Sends an instruction to liberate and vacate the table when all patron bills are settled.
   *
   * @param tableId Unique identifier of the table.
   * @param guestName Optional name of the guest vacating the table.
   * @returns Observable completing when the table state is updated.
   */
  liberateTable(tableId: number, guestName?: string): Observable<void> {
    const payload: LiberateTableRequest = {
      tableId,
      guestName: guestName || null,
    };
    return this.http.post<void>(`${this.publicBaseUrl}/${tableId}/payments/liberate`, payload);
  }

  /**
   * Sends the official payment receipt PDF to the customer's email address.
   *
   * @param tableId Unique identifier of the table.
   * @param transactionId Unique transaction identifier.
   * @param email Destination customer email.
   * @returns Observable completing on dispatch.
   */
  sendReceiptEmail(tableId: number, transactionId: string, email: string): Observable<void> {
    const payload: SendReceiptEmailRequest = { email };
    return this.http.post<void>(`${this.publicBaseUrl}/${tableId}/payments/${transactionId}/receipt-email`, payload);
  }

  /**
   * Generates the direct download URL for the legal digital receipt PDF.
   *
   * @param tableId Unique identifier of the table.
   * @param transactionId Unique transaction identifier.
   * @returns Download URL string.
   */
  getReceiptPdfUrl(tableId: number, transactionId: string): string {
    return `${this.publicBaseUrl}/${tableId}/payments/${transactionId}/receipt.pdf`;
  }
}
