import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap, catchError, of, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BarTab,
  BarTabCreateRequest,
  BarTabDetail,
  BarTabOrderTransferRequest,
  BarTabStatus,
  BarTabTransferRequest,
  BarTabUpdateRequest
} from '../models/bar-tab.model';
import { WebSocketService } from './websocket.service';
import { EncaissementRequest, TableAdditionResponse } from '../../features/dashboard-serveur/services/dashboard-serveur.service';
import { Facture } from '../../features/factures/models/facture.model';

/**
 * Service managing customer running ledgers (bar tabs) without mandatory physical table binding.
 * Provides reactive signals, REST API interactions, and live STOMP WebSocket synchronization.
 */
@Injectable({ providedIn: 'root' })
export class BarTabService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly wsService = inject(WebSocketService);
  private readonly baseUrl = `${environment.apiUrl}/bar-tabs`;
  private readonly destroy$ = new Subject<void>();

  /** Reactive list of all loaded bar tabs. */
  readonly tabs = signal<BarTab[]>([]);

  /** Loading indicator signal. */
  readonly isLoading = signal<boolean>(false);

  /** Computed signal returning only active customer bar tabs. */
  readonly activeTabs = computed(() => this.tabs().filter(t => t.statut === 'ACTIVE'));

  /** Computed signal returning count of currently open active tabs. */
  readonly activeCount = computed(() => this.activeTabs().length);

  /** Computed signal returning total outstanding ledger amount across active tabs. */
  readonly activeTotalAmount = computed(() =>
    this.activeTabs().reduce((sum, tab) => sum + (tab.total || 0), 0)
  );

  constructor() {
    this.initWebSocket();
    this.loadTabs().subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initializes real-time WebSocket subscription on `/topic/bar-tabs`.
   */
  private initWebSocket(): void {
    this.wsService.watch('/topic/bar-tabs')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msg) => {
          try {
            const updatedTab: BarTab = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
            if (updatedTab?.id) {
              this.tabs.update(current => {
                const index = current.findIndex(t => t.id === updatedTab.id);
                if (index >= 0) {
                  const clone = [...current];
                  clone[index] = updatedTab;
                  return clone;
                }
                return [updatedTab, ...current];
              });
            }
          } catch {
            // Malformed message safely ignored
          }
        },
        error: (err) => console.warn('[BarTabService] WebSocket subscription error:', err)
      });
  }

  /**
   * Loads all bar tabs, optionally filtered by status (defaults to ACTIVE).
   *
   * @param statut Optional status filter
   * @returns Observable emitting loaded bar tabs
   */
  loadTabs(statut?: BarTabStatus): Observable<BarTab[]> {
    this.isLoading.set(true);
    const url = statut ? `${this.baseUrl}?statut=${statut}` : this.baseUrl;
    return this.http.get<BarTab[]>(url).pipe(
      tap(data => {
        this.tabs.set(data || []);
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.error('[BarTabService] Failed to load bar tabs:', err);
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  /**
   * Retrieves full details, orders, and item ledger for a specific bar tab.
   *
   * @param id Bar tab identifier
   * @returns Observable emitting full bar tab details
   */
  getTabDetail(id: number): Observable<BarTabDetail> {
    return this.http.get<BarTabDetail>(`${this.baseUrl}/${id}`);
  }

  /**
   * Opens and activates a new customer bar tab.
   *
   * @param request Creation payload
   * @returns Observable emitting newly created bar tab
   */
  createTab(request: BarTabCreateRequest): Observable<BarTab> {
    return this.http.post<BarTab>(this.baseUrl, request).pipe(
      tap(newTab => {
        this.tabs.update(current => [newTab, ...current]);
      })
    );
  }

  /**
   * Updates metadata (name, notes, client reference, deposit) for an active bar tab.
   *
   * @param id Bar tab identifier
   * @param request Update payload
   * @returns Observable emitting updated bar tab
   */
  updateTab(id: number, request: BarTabUpdateRequest): Observable<BarTab> {
    return this.http.put<BarTab>(`${this.baseUrl}/${id}`, request).pipe(
      tap(updatedTab => {
        this.tabs.update(current =>
          current.map(t => t.id === id ? updatedTab : t)
        );
      })
    );
  }

  /**
   * Adds an order directly to an active bar tab.
   *
   * @param tabId Bar tab identifier
   * @param order Order payload
   * @returns Observable emitting created order
   */
  addOrderToTab(tabId: number, order: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/${tabId}/orders`, order).pipe(
      tap(() => this.loadTabs().subscribe())
    );
  }

  /**
   * Transfers active orders from a physical table to a customer bar tab.
   *
   * @param tabId Target bar tab identifier
   * @param request Transfer parameters
   * @returns Observable emitting updated bar tab
   */
  transferOrdersFromTable(tabId: number, request: BarTabTransferRequest): Observable<BarTab> {
    return this.http.post<BarTab>(`${this.baseUrl}/${tabId}/transfer-from-table`, request).pipe(
      tap(updatedTab => {
        this.tabs.update(current =>
          current.map(t => t.id === tabId ? updatedTab : t)
        );
      })
    );
  }

  /**
   * Transfers all active orders of a bar tab onto a physical table.
   *
   * @param tabId Source bar tab identifier
   * @param request Transfer parameters
   * @returns Observable emitting updated bar tab
   */
  transferTabToTable(tabId: number, request: BarTabTransferRequest): Observable<BarTab> {
    return this.http.post<BarTab>(`${this.baseUrl}/${tabId}/transfer-to-table`, request).pipe(
      tap(updatedTab => {
        this.tabs.update(current =>
          current.map(t => t.id === tabId ? updatedTab : t)
        );
      })
    );
  }

  /**
   * Transfers a single order between a bar tab and another destination.
   *
   * @param tabId Bar tab identifier
   * @param request Order transfer parameters
   * @returns Observable emitting updated bar tab
   */
  transferSingleOrder(tabId: number, request: BarTabOrderTransferRequest): Observable<BarTab> {
    return this.http.post<BarTab>(`${this.baseUrl}/${tabId}/transfer-order`, request).pipe(
      tap(updatedTab => {
        this.tabs.update(current =>
          current.map(t => t.id === tabId ? updatedTab : t)
        );
      })
    );
  }

  /**
   * Cancels an empty or voided bar tab.
   *
   * @param tabId Bar tab identifier
   * @param reason Optional cancellation reason
   * @returns Observable emitting cancelled bar tab
   */
  cancelTab(tabId: number, reason?: string): Observable<BarTab> {
    const url = reason
      ? `${this.baseUrl}/${tabId}/cancel?reason=${encodeURIComponent(reason)}`
      : `${this.baseUrl}/${tabId}/cancel`;
    return this.http.post<BarTab>(url, {}).pipe(
      tap(cancelledTab => {
        this.tabs.update(current =>
          current.map(t => t.id === tabId ? cancelledTab : t)
        );
      })
    );
  }

  /**
   * Computes the bill breakdown and items for a bar tab.
   *
   * @param tabId Bar tab identifier
   * @returns Observable emitting table addition breakdown
   */
  getTabAddition(tabId: number): Observable<TableAdditionResponse> {
    return this.http.get<TableAdditionResponse>(`${this.baseUrl}/${tabId}/addition`);
  }

  /**
   * Settles, invoices, and closes an active bar tab.
   *
   * @param tabId Bar tab identifier
   * @param request Encaissement payload
   * @returns Observable emitting generated invoice
   */
  encaisserTab(tabId: number, request: EncaissementRequest): Observable<Facture> {
    return this.http.post<Facture>(`${this.baseUrl}/${tabId}/encaisser`, request).pipe(
      tap(() => {
        this.tabs.update(current =>
          current.map(t => t.id === tabId ? { ...t, statut: 'SETTLED' as BarTabStatus } : t)
        );
      })
    );
  }
}
