import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, Subject, takeUntil, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { environment } from '../../../environments/environment';
import {
  CommissionSyncResult,
  LedgerVerificationResult,
  MonetizationDashboard,
  MonetizationSummary,
  MonthlyCommissionProof,
} from '../models/monetization.model';
import { WebSocketService } from './websocket.service';
import { selectIsAuthenticated } from '../store/auth.selectors';

/**
 * Service managing OpenBar's dual-tier TPE payment monetization state,
 * commission grace-period alerts, SHA-256 ledger verification, offline Z-report proof exports,
 * and online Stripe Billing synchronization.
 */
@Injectable({ providedIn: 'root' })
export class MonetizationService implements OnDestroy {
  private readonly apiUrl = `${environment.apiUrl}/admin/monetization`;
  private readonly http = inject(HttpClient, { optional: true });
  private readonly ws = inject(WebSocketService, { optional: true });
  private readonly store = inject(Store, { optional: true });
  private readonly destroy$ = new Subject<void>();

  /** Lightweight reactive monetization & commission grace-period summary. */
  readonly summary = signal<MonetizationSummary | null>(null);

  /** Latest full administrative monetization dashboard snapshot. */
  readonly dashboard = signal<MonetizationDashboard | null>(null);

  /** True when a commission invoice warning or grace-period alert banner should be displayed. */
  readonly shouldShowBanner = computed(() => Boolean(this.summary()?.shouldShowBanner));

  /** True when TPE card payments are temporarily locked due to an overdue commission invoice. */
  readonly isTpeCardLocked = computed(() => Boolean(this.summary()?.tpeCardLocked));

  constructor() {
    this.initAuthAndWebSocketListeners();
  }

  /** @inheritdoc */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads the lightweight monetization and grace-period summary for authenticated POS staff.
   *
   * @returns Observable emitting {@link MonetizationSummary} or null on fallback
   */
  loadSummary(): Observable<MonetizationSummary | null> {
    if (!this.http) {
      return of(null);
    }
    return this.http.get<MonetizationSummary>(`${this.apiUrl}/status`).pipe(
      tap(data => {
        if (data) {
          this.summary.set(data);
        }
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Loads the full administrative monetization dashboard for an optional YYYY-MM billing period.
   *
   * @param period Optional YYYY-MM period
   * @returns Observable emitting {@link MonetizationDashboard}
   */
  getDashboard(period?: string): Observable<MonetizationDashboard> {
    if (!this.http) {
      return of({} as MonetizationDashboard);
    }
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }
    return this.http.get<MonetizationDashboard>(`${this.apiUrl}/dashboard`, { params }).pipe(
      tap(data => {
        if (data) {
          this.dashboard.set(data);
          if (data.summary) {
            this.summary.set(data.summary);
          }
        }
      })
    );
  }

  /**
   * Runs a cryptographic SHA-256 chain verification audit across the local commission ledger.
   *
   * @returns Observable emitting {@link LedgerVerificationResult}
   */
  verifyIntegrity(): Observable<LedgerVerificationResult> {
    if (!this.http) {
      return of({} as LedgerVerificationResult);
    }
    return this.http.post<LedgerVerificationResult>(`${this.apiUrl}/verify`, {});
  }

  /**
   * Generates a signed monthly Z-report & card commission proof bundle for openbar.fr portal upload.
   *
   * @param period Optional YYYY-MM period
   * @returns Observable emitting {@link MonthlyCommissionProof}
   */
  exportMonthlyProof(period?: string): Observable<MonthlyCommissionProof> {
    if (!this.http) {
      return of({} as MonthlyCommissionProof);
    }
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }
    return this.http.get<MonthlyCommissionProof>(`${this.apiUrl}/export-proof`, { params });
  }

  /**
   * Downloads the signed monthly Z-report proof bundle as a formatted JSON attachment.
   *
   * @param period Optional YYYY-MM period
   * @returns Observable emitting Blob
   */
  downloadMonthlyProof(period?: string): Observable<Blob> {
    if (!this.http) {
      return of(new Blob());
    }
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }
    return this.http.get(`${this.apiUrl}/export-proof/download`, {
      params,
      responseType: 'blob',
    });
  }

  /**
   * Triggers online synchronization of Option 1 card commission receipts with central Stripe Billing.
   *
   * @param period Optional YYYY-MM period
   * @returns Observable emitting {@link CommissionSyncResult}
   */
  syncOnline(period?: string): Observable<CommissionSyncResult> {
    if (!this.http) {
      return of({} as CommissionSyncResult);
    }
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }
    return this.http.post<CommissionSyncResult>(`${this.apiUrl}/sync`, {}, { params }).pipe(
      tap(res => {
        if (res?.summary) {
          this.summary.set(res.summary);
        }
      })
    );
  }

  private initAuthAndWebSocketListeners(): void {
    if (this.store) {
      this.store
        .select(selectIsAuthenticated)
        .pipe(takeUntil(this.destroy$))
        .subscribe(isAuth => {
          if (isAuth) {
            this.loadSummary().subscribe();
          } else {
            this.summary.set(null);
            this.dashboard.set(null);
          }
        });
    }

    if (this.ws) {
      this.ws
        .watch('/topic/monetization')
        .pipe(takeUntil(this.destroy$))
        .subscribe(msg => {
          try {
            const parsed = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
            if (parsed && typeof parsed === 'object') {
              this.summary.set(parsed as MonetizationSummary);
            }
          } catch (err) {
            console.error('[MonetizationService] Failed to parse WebSocket monetization message', err);
          }
        });
    }
  }
}
