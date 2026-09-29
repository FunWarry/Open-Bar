import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { filter, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { WebSocketService } from './websocket.service';
import {
  TpePaymentRequest,
  TpePaymentResponse,
  TpeConnectionTestRequest,
  TpeConnectionTestResponse,
  TpePublicConfig,
  TpeTerminalRole
} from '../models/tpe.model';

const STORAGE_KEY_PREFERRED_TPE_ROLE = 'openbar_preferred_tpe_role';

/**
 * Service for managing payment terminal (TPE) communication, real-time STOMP transaction
 * status streaming, diagnostic connection testing, and station preferences.
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentTerminalService {
  private readonly http = inject(HttpClient);
  private readonly wsService = inject(WebSocketService);
  private readonly apiUrl = `${environment.apiUrl}/tpe`;

  private readonly paymentEventsSubject = new Subject<TpePaymentResponse>();

  /**
   * Stream of real-time payment terminal status events received over STOMP topic `/topic/payments`.
   */
  readonly paymentEvents$: Observable<TpePaymentResponse> = this.paymentEventsSubject.asObservable();

  constructor() {
    this.initWebSocketSubscription();
  }

  private initWebSocketSubscription(): void {
    this.wsService.watch('/topic/payments').subscribe({
      next: (msg) => {
        try {
          const payload = JSON.parse(msg.body) as TpePaymentResponse;
          this.paymentEventsSubject.next(payload);
        } catch {
          // Ignore unparseable frames
        }
      },
      error: () => {
        // Keep resilient on connection glitches
      }
    });
  }

  /**
   * Dispatches a card payment amount to a physical or simulated payment terminal.
   *
   * @param request Payment parameters
   * @returns Observable of initial transaction response
   */
  initiatePayment(request: TpePaymentRequest): Observable<TpePaymentResponse> {
    return this.http.post<TpePaymentResponse>(`${this.apiUrl}/pay`, request);
  }

  /**
   * Cancels an active in-flight transaction on the payment terminal.
   *
   * @param transactionId Target transaction identifier
   * @returns Observable of updated transaction response marked as CANCELLED
   */
  cancelPayment(transactionId: string): Observable<TpePaymentResponse> {
    return this.http.post<TpePaymentResponse>(`${this.apiUrl}/cancel/${transactionId}`, {});
  }

  /**
   * Retrieves the current status of an ongoing or completed transaction.
   *
   * @param transactionId Target transaction identifier
   * @returns Observable of current transaction status
   */
  getStatus(transactionId: string): Observable<TpePaymentResponse> {
    return this.http.get<TpePaymentResponse>(`${this.apiUrl}/status/${transactionId}`);
  }

  /**
   * Subscribes to status updates specifically filtered for a target transaction ID.
   *
   * @param transactionId Target transaction identifier
   * @returns Observable emitting events matching the transactionId
   */
  watchTransaction(transactionId: string): Observable<TpePaymentResponse> {
    return this.paymentEvents$.pipe(
      filter(event => event.transactionId === transactionId),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Alias for {@link watchTransaction} to observe live lifecycle transitions of a transaction.
   *
   * @param transactionId Target transaction identifier
   * @returns Observable emitting events matching the transactionId
   */
  watchPayment(transactionId: string): Observable<TpePaymentResponse> {
    return this.watchTransaction(transactionId);
  }

  /**
   * Performs a diagnostic connectivity and Concert handshake test against the terminal.
   *
   * @param request Test connection parameters
   * @returns Observable of diagnostic outcome
   */
  testConnection(request: TpeConnectionTestRequest): Observable<TpeConnectionTestResponse> {
    return this.http.post<TpeConnectionTestResponse>(`${this.apiUrl}/test-connection`, request);
  }

  /**
   * Retrieves public terminal configuration and availability.
   *
   * @returns Observable of public TPE configuration
   */
  getConfig(): Observable<TpePublicConfig> {
    return this.http.get<TpePublicConfig>(`${this.apiUrl}/config`);
  }

  /**
   * Preferred terminal role accessor.
   */
  get preferredRole(): TpeTerminalRole {
    return this.getPreferredTerminalRole();
  }

  set preferredRole(role: TpeTerminalRole) {
    this.setPreferredTerminalRole(role);
  }

  /**
   * Retrieves this workstation's locally preferred TPE role from browser storage.
   *
   * @returns 'BAR' or 'FLOOR'
   */
  getPreferredTerminalRole(): TpeTerminalRole {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFERRED_TPE_ROLE);
      if (stored === 'FLOOR' || stored === 'BAR') {
        return stored;
      }
    } catch {
      // Fallback
    }
    return 'BAR';
  }

  /**
   * Sets this workstation's locally preferred TPE role in browser storage.
   *
   * @param role Preferred terminal station role
   */
  setPreferredTerminalRole(role: TpeTerminalRole): void {
    try {
      localStorage.setItem(STORAGE_KEY_PREFERRED_TPE_ROLE, role);
    } catch {
      // Fallback
    }
  }
}
