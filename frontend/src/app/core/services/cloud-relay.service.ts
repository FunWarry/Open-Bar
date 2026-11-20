import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, Subject, takeUntil, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CloudRelayDiagnostic,
  CloudRelayStatus,
  PublicBranding
} from '../models/cloud-relay.model';
import { WebSocketService } from './websocket.service';

/**
 * Angular service managing outbound Cloud Relay tunnel status, diagnostics,
 * simulator controls, and real-time STOMP updates over {@code /topic/cloud-relay}.
 */
@Injectable({ providedIn: 'root' })
export class CloudRelayService implements OnDestroy {
  private readonly adminApi = `${environment.apiUrl}/admin/cloud-relay`;
  private readonly publicApi = `${environment.apiUrl}/public`;
  private readonly http = inject(HttpClient, { optional: true });
  private readonly ws = inject(WebSocketService, { optional: true });
  private readonly destroy$ = new Subject<void>();

  /** Latest Cloud Relay tunnel status and access matrix telemetry. */
  readonly status = signal<CloudRelayStatus | null>(null);

  /** Latest public branding and fallback metadata. */
  readonly publicBranding = signal<PublicBranding | null>(null);

  /** True when a Cloud Relay outage (HTTP 503 CLOUD_RELAY_OFFLINE) was intercepted. */
  readonly tunnelOfflineDetected = signal<boolean>(false);

  constructor() {
    this.initWebSocketSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetches live Cloud Relay tunnel telemetry and access policy summary.
   */
  getStatus(): Observable<CloudRelayStatus | null> {
    if (!this.http) {
      return of(null);
    }
    return this.http.get<CloudRelayStatus>(`${this.adminApi}/status`).pipe(
      tap(res => this.status.set(res))
    );
  }

  /**
   * Triggers outbound tunnel connection or reconnection.
   */
  connect(): Observable<CloudRelayStatus | null> {
    if (!this.http) {
      return of(null);
    }
    return this.http.post<CloudRelayStatus>(`${this.adminApi}/connect`, {}).pipe(
      tap(res => this.status.set(res))
    );
  }

  /**
   * Gracefully disconnects the outbound Cloud Relay tunnel.
   */
  disconnect(): Observable<CloudRelayStatus | null> {
    if (!this.http) {
      return of(null);
    }
    return this.http.post<CloudRelayStatus>(`${this.adminApi}/disconnect`, {}).pipe(
      tap(res => this.status.set(res))
    );
  }

  /**
   * Executes on-demand connectivity, subdomain, and custom CNAME DNS diagnostics.
   */
  runDiagnostics(): Observable<CloudRelayDiagnostic | null> {
    if (!this.http) {
      return of(null);
    }
    return this.http.post<CloudRelayDiagnostic>(`${this.adminApi}/test`, {});
  }

  /**
   * Simulates an abrupt tunnel disconnect in simulator mode for offline fallback testing.
   */
  simulateDisconnect(): Observable<CloudRelayStatus | null> {
    if (!this.http) {
      return of(null);
    }
    return this.http.post<CloudRelayStatus>(`${this.adminApi}/simulator/disconnect`, {}).pipe(
      tap(res => this.status.set(res))
    );
  }

  /**
   * Restores simulated tunnel connectivity after a simulated disconnect.
   */
  simulateReconnect(): Observable<CloudRelayStatus | null> {
    if (!this.http) {
      return of(null);
    }
    return this.http.post<CloudRelayStatus>(`${this.adminApi}/simulator/reconnect`, {}).pipe(
      tap(res => this.status.set(res))
    );
  }

  /**
   * Fetches public-safe white-label branding and local Wi-Fi fallback metadata.
   */
  getPublicBranding(): Observable<PublicBranding | null> {
    if (!this.http) {
      return of(null);
    }
    return this.http.get<PublicBranding>(`${this.publicApi}/branding`).pipe(
      tap(res => {
        this.publicBranding.set(res);
        if (res && (!res.cloudRelayEnabled || res.tunnelConnected)) {
          this.tunnelOfflineDetected.set(false);
        }
      })
    );
  }

  /**
   * Probes Cloud Relay health and local Wi-Fi fallback metadata.
   */
  checkRelayHealth(): Observable<PublicBranding | null> {
    if (!this.http) {
      return of(null);
    }
    return this.http.get<PublicBranding>(`${this.publicApi}/cloud-relay/health`, {
      headers: { 'X-Silent-Probe': 'true' }
    }).pipe(
      tap(res => {
        this.publicBranding.set(res);
        if (res?.tunnelConnected) {
          this.tunnelOfflineDetected.set(false);
        }
      })
    );
  }

  /**
   * Marks the tunnel as offline when an HTTP 503 CLOUD_RELAY_OFFLINE response is received.
   */
  markTunnelOffline(): void {
    this.tunnelOfflineDetected.set(true);
  }

  /**
   * Clears the offline tunnel flag after successful reconnection.
   */
  clearTunnelOffline(): void {
    this.tunnelOfflineDetected.set(false);
  }

  private initWebSocketSubscription(): void {
    if (!this.ws) {
      return;
    }
    this.ws.watch('/topic/cloud-relay')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const parsed = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
          if (parsed && typeof parsed === 'object') {
            this.status.set(parsed as CloudRelayStatus);
          }
        } catch (err) {
          console.error('[CloudRelayService] Failed to parse tunnel status update', err);
        }
      });
  }
}
