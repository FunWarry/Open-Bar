import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of, Subject, takeUntil, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { environment } from '../../../environments/environment';
import {
  LicenseStatusInfo,
  LicenseSummaryInfo,
  LicenseSyncResult,
} from '../models/license.model';
import { WebSocketService } from './websocket.service';
import { FeatureFlagService } from './feature-flag.service';
import { selectIsAuthenticated } from '../store/auth.selectors';

/**
 * Service managing OpenBar hybrid offline/online DRM licensing state on the frontend.
 * <p>
 * Provides reactive signals for staff grace-period / expiration banners, administrative
 * license inspection, manual offline JWT activation, and online synchronization triggers.
 */
@Injectable({ providedIn: 'root' })
export class LicenseService implements OnDestroy {
  private readonly apiUrl = `${environment.apiUrl}/admin/license`;
  private readonly http = inject(HttpClient, { optional: true });
  private readonly ws = inject(WebSocketService, { optional: true });
  private readonly featureFlagService = inject(FeatureFlagService, { optional: true });
  private readonly store = inject(Store, { optional: true });
  private readonly destroy$ = new Subject<void>();

  /** Reactive lightweight license summary for authenticated staff UI. */
  readonly summary = signal<LicenseSummaryInfo | null>(null);

  /** Full administrative license status snapshot (loaded on /admin/license). */
  readonly detailedStatus = signal<LicenseStatusInfo | null>(null);

  /** True when the venue is currently inside the 2-day post-expiration grace window. */
  readonly isInGracePeriod = computed(() => this.summary()?.status === 'GRACE_PERIOD');

  /** True when order creation is locked due to an expired, invalid, or missing enforced license. */
  readonly isOrderCreationLocked = computed(() => {
    const current = this.summary();
    return current !== null && !current.orderCreationAllowed;
  });

  /** True when either a grace-period warning or expiration lock banner should be shown to staff. */
  readonly shouldShowStaffBanner = computed(() => {
    const current = this.summary();
    if (!current) {
      return false;
    }
    return (
      current.status === 'GRACE_PERIOD' ||
      (current.enforced && (current.status === 'EXPIRED' || current.status === 'UNLICENSED' || current.status === 'INVALID'))
    );
  });

  constructor() {
    this.initAuthAndWebSocketListeners();
  }

  /** @inheritdoc */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads the lightweight license summary for the current authenticated staff session.
   *
   * @returns Observable emitting the {@link LicenseSummaryInfo} or null on network fallback
   */
  loadSummary(): Observable<LicenseSummaryInfo | null> {
    if (!this.http) {
      return of(null);
    }
    return this.http.get<LicenseSummaryInfo>(`${this.apiUrl}/status`).pipe(
      tap(data => {
        if (data) {
          this.summary.set(data);
        }
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Retrieves detailed administrative license diagnostics, claims, and module entitlements.
   *
   * @returns Observable emitting {@link LicenseStatusInfo}
   */
  getFullStatus(): Observable<LicenseStatusInfo> {
    if (!this.http) {
      return of({} as LicenseStatusInfo);
    }
    return this.http.get<LicenseStatusInfo>(this.apiUrl).pipe(
      tap(status => {
        if (status) {
          this.detailedStatus.set(status);
          this.syncSummaryFromFull(status);
        }
      })
    );
  }

  /**
   * Submits a manually pasted or uploaded signed JWT license token for offline activation.
   *
   * @param licenseToken Compact signed JWT string
   * @returns Observable emitting updated {@link LicenseStatusInfo}
   */
  activateOfflineLicense(licenseToken: string): Observable<LicenseStatusInfo> {
    if (!this.http) {
      return of({} as LicenseStatusInfo);
    }
    return this.http
      .post<LicenseStatusInfo>(`${this.apiUrl}/activate`, { licenseToken })
      .pipe(
        tap(status => {
          if (status) {
            this.detailedStatus.set(status);
            this.syncSummaryFromFull(status);
          }
        })
      );
  }

  /**
   * Triggers an immediate online license synchronization with the remote licensing authority.
   *
   * @returns Observable emitting {@link LicenseSyncResult}
   */
  syncOnline(): Observable<LicenseSyncResult> {
    if (!this.http) {
      return of({} as LicenseSyncResult);
    }
    return this.http.post<LicenseSyncResult>(`${this.apiUrl}/sync`, {}).pipe(
      tap(res => {
        if (res?.license) {
          this.detailedStatus.set(res.license);
          this.syncSummaryFromFull(res.license);
        }
      })
    );
  }

  /**
   * Deactivates and clears the currently stored commercial license token.
   *
   * @returns Observable emitting updated {@link LicenseStatusInfo}
   */
  deactivateLicense(): Observable<LicenseStatusInfo> {
    if (!this.http) {
      return of({} as LicenseStatusInfo);
    }
    return this.http.delete<LicenseStatusInfo>(this.apiUrl).pipe(
      tap(status => {
        if (status) {
          this.detailedStatus.set(status);
          this.syncSummaryFromFull(status);
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
            this.detailedStatus.set(null);
          }
        });
    }

    if (this.ws) {
      this.ws
        .watch('/topic/license')
        .pipe(takeUntil(this.destroy$))
        .subscribe(msg => {
          try {
            const parsed = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
            if (parsed && typeof parsed === 'object') {
              this.summary.set(parsed as LicenseSummaryInfo);
              this.featureFlagService?.loadModules().subscribe();
            }
          } catch (err) {
            console.error('[LicenseService] Failed to parse WebSocket license message', err);
          }
        });
    }
  }

  private syncSummaryFromFull(status: LicenseStatusInfo): void {
    this.summary.set({
      status: status.status,
      plan: status.plan,
      expiresAt: status.expiresAt,
      graceEndsAt: status.graceEndsAt,
      graceHoursRemaining: status.graceHoursRemaining,
      orderCreationAllowed: status.orderCreationAllowed,
      enforced: status.enforced,
    });
  }
}
