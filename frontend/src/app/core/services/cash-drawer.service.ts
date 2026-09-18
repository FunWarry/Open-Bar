import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CashDrawerOpenRequest,
  CashDrawerSession,
  CashDrawerStatus,
  CashMovement,
  CashMovementRequest,
  XReport
} from '../models/cash-drawer.model';
import { PrintResult } from '../models/printer.model';

/**
 * Service managing cash drawer operations: till opening, intra-day movements,
 * intermediate X-reports, and audit slips.
 */
@Injectable({ providedIn: 'root' })
export class CashDrawerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/cash-drawer`;

  /** Reactive status of the cash drawer for today. */
  readonly status = signal<CashDrawerStatus | null>(null);

  /** Indicates whether the till has been opened today and is currently open. */
  readonly isOpened = computed(() => this.status()?.isOpened ?? false);

  /** Indicates whether today's session is already closed. */
  readonly isClosed = computed(() => this.status()?.isClosed ?? false);

  /** Current theoretical cash amount residing in the physical drawer. */
  readonly currentTheoreticalCash = computed(() => this.status()?.currentTheoreticalCash ?? 0);

  /** Starting float recorded at morning opening. */
  readonly startingFloat = computed(() => this.status()?.startingFloat ?? 0);

  /** Total number of intra-day cash movements logged today. */
  readonly totalMovementsCount = computed(() => this.status()?.totalMovementsCount ?? 0);

  /**
   * Retrieves current cash drawer status from the server and updates reactive signal.
   *
   * @returns Observable emitting {@link CashDrawerStatus}
   */
  getStatus(): Observable<CashDrawerStatus> {
    return this.http.get<CashDrawerStatus>(`${this.baseUrl}/status`).pipe(
      tap(s => this.status.set(s))
    );
  }

  /**
   * Triggers an asynchronous status refresh from backend and updates reactive signal.
   */
  refreshStatus(): void {
    this.getStatus().subscribe({
      error: () => {
        // Silently handled; reactive signal retains last valid state
      }
    });
  }

  /**
   * Opens the cash drawer register for today with the counted float.
   *
   * @param request Opening parameters and denomination breakdown
   * @returns Observable emitting created {@link CashDrawerSession}
   */
  openDrawer(request: CashDrawerOpenRequest): Observable<CashDrawerSession> {
    return this.http.post<CashDrawerSession>(`${this.baseUrl}/open`, request).pipe(
      tap(() => this.getStatus().subscribe())
    );
  }

  /**
   * Records an intra-day cash movement (Cash In, Cash Drop, Paid Out).
   *
   * @param request Movement parameters
   * @returns Observable emitting created {@link CashMovement}
   */
  recordMovement(request: CashMovementRequest): Observable<CashMovement> {
    return this.http.post<CashMovement>(`${this.baseUrl}/movement`, request).pipe(
      tap(() => this.getStatus().subscribe())
    );
  }

  /**
   * Lists cash movements for an operational date.
   *
   * @param date Optional ISO date string (YYYY-MM-DD)
   * @returns Observable emitting array of {@link CashMovement}
   */
  getMovements(date?: string): Observable<CashMovement[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<CashMovement[]>(`${this.baseUrl}/movements`, { params });
  }

  /**
   * Generates a non-destructive intermediate X-Report for mid-shift auditing.
   *
   * @param date Optional ISO date string (YYYY-MM-DD)
   * @returns Observable emitting {@link XReport}
   */
  getXReport(date?: string): Observable<XReport> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<XReport>(`${this.baseUrl}/x-report`, { params });
  }

  /**
   * Downloads intermediate X-Report certified PDF document.
   *
   * @param date Optional ISO date string (YYYY-MM-DD)
   * @returns Observable emitting binary PDF Blob
   */
  downloadXReportPdf(date?: string): Observable<Blob> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get(`${this.baseUrl}/x-report/pdf`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Prints the intermediate X-Report ticket on the ESC/POS cash desk printer.
   *
   * @param date Optional ISO date string (YYYY-MM-DD)
   * @returns Observable emitting {@link PrintResult}
   */
  printXReport(date?: string): Observable<PrintResult> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.post<PrintResult>(`${this.baseUrl}/x-report/print`, {}, { params });
  }

  /**
   * Prints a drawer opening audit slip on the ESC/POS printer.
   *
   * @param sessionId Cash drawer session ID
   * @returns Observable emitting {@link PrintResult}
   */
  printTillOpeningSlip(sessionId: number): Observable<PrintResult> {
    return this.http.post<PrintResult>(`${this.baseUrl}/session/${sessionId}/print`, {});
  }

  /**
   * Prints a cash movement audit slip on the ESC/POS printer.
   *
   * @param movementId Cash movement ID
   * @returns Observable emitting {@link PrintResult}
   */
  printCashMovementSlip(movementId: number): Observable<PrintResult> {
    return this.http.post<PrintResult>(`${this.baseUrl}/movements/${movementId}/print`, {});
  }
}
