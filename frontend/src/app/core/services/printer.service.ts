import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PrinterConnectionTestRequest, PrinterRole, PrinterStatus, PrintResult } from '../models/printer.model';

/**
 * Service managing direct ESC/POS network thermal printer operations, connectivity tests,
 * order ticket dispatching, invoice receipt printing, and cash drawer kicking.
 */
@Injectable({ providedIn: 'root' })
export class PrinterService {
  private readonly api = `${environment.apiUrl}/printers`;
  private readonly http = inject(HttpClient);

  /**
   * Retrieves current printer network configuration and status.
   *
   * @returns Observable of printer status
   */
  getStatus(): Observable<PrinterStatus> {
    return this.http.get<PrinterStatus>(`${this.api}/status`);
  }

  /**
   * Sends a test ticket to the configured printer for a specific role.
   *
   * @param role Printer workstation role (BAR, KITCHEN, CASH_DESK)
   * @returns Observable of print result report
   */
  testPrintRole(role: PrinterRole): Observable<PrintResult> {
    return this.http.post<PrintResult>(`${this.api}/test/${role}`, {});
  }

  /**
   * Tests raw network socket connectivity to an arbitrary IP and port.
   *
   * @param request Target connection parameters
   * @returns Observable of print result report
   */
  testConnection(request: PrinterConnectionTestRequest): Observable<PrintResult> {
    return this.http.post<PrintResult>(`${this.api}/test-connection`, request);
  }

  /**
   * Dispatches order preparation tickets to configured bar and kitchen printers.
   *
   * @param orderId Order identifier
   * @returns Observable of dispatch results per targeted workstation
   */
  dispatchOrder(orderId: number): Observable<PrintResult[]> {
    return this.http.post<PrintResult[]>(`${this.api}/orders/${orderId}/dispatch`, {});
  }

  /**
   * Prints an invoice thermal receipt on the cash desk printer.
   *
   * @param invoiceId Invoice identifier
   * @param openCashDrawer Whether to trigger cash drawer kick pulse
   * @returns Observable of print result report
   */
  printInvoiceReceipt(invoiceId: number, openCashDrawer = false): Observable<PrintResult> {
    const params = new HttpParams().set('openCashDrawer', openCashDrawer.toString());
    return this.http.post<PrintResult>(`${this.api}/invoices/${invoiceId}/receipt`, {}, { params });
  }

  /**
   * Pulses the cash drawer kick command via the cash desk printer.
   *
   * @returns Observable of execution result report
   */
  openCashDrawer(): Observable<PrintResult> {
    return this.http.post<PrintResult>(`${this.api}/cash-drawer/open`, {});
  }
}
