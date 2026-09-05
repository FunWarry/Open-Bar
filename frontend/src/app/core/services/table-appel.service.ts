import { Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TableAppel, TableAppelRequest, TableAppelType } from '../models/table-appel.model';
import { WebSocketService } from './websocket.service';

/**
 * Service managing table call alerts (waiter assistance and bill requests).
 * Handles HTTP requests, real-time STOMP WebSocket tracking, active call signals,
 * and client rate-limiting state.
 */
@Injectable({ providedIn: 'root' })
export class TableAppelService implements OnDestroy {
  private readonly publicApi = '/api/public/tables';
  private readonly staffApi = '/api/tables';

  /** Reactive signal containing all active unacknowledged alerts across the establishment. */
  readonly activeAppels = signal<TableAppel[]>([]);

  /** Subject notifying components when an alert is created or updated. */
  readonly appelEvents$ = new Subject<TableAppel>();

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly http: HttpClient,
    private readonly wsService: WebSocketService,
  ) {
    this.initWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initializes STOMP WebSocket watchers for real-time table alert notifications.
   */
  private initWebSocket(): void {
    this.wsService.watch('/topic/serveur/appels')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data: TableAppel = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
          if (data?.id) {
            this.handleLiveAppelEvent(data);
          }
        } catch {
          // Malformed message safely ignored
        }
      });
  }

  /**
   * Updates reactive state upon receiving a live table call event.
   *
   * @param appel - Received table alert payload.
   */
  private handleLiveAppelEvent(appel: TableAppel): void {
    if (appel.statut === 'EN_ATTENTE') {
      this.activeAppels.update(current => {
        const filtered = current.filter(a => a.id !== appel.id);
        return [appel, ...filtered];
      });
    } else {
      this.activeAppels.update(current => current.filter(a => a.id !== appel.id));
    }
    this.appelEvents$.next(appel);
  }

  /**
   * Submits a new waiter call or bill request anonymously from a table QR code.
   *
   * @param tableId - Table identifier.
   * @param type - Alert type ('ASSISTANCE' or 'ADDITION').
   * @param commentaire - Optional specification or message.
   * @returns Observable emitting the created {@link TableAppel}.
   */
  appelerServeur(tableId: number, type: TableAppelType = 'ASSISTANCE', commentaire?: string): Observable<TableAppel> {
    const payload: TableAppelRequest = { type, commentaire };
    return this.http.post<TableAppel>(`${this.publicApi}/${tableId}/appel`, payload).pipe(
      tap(created => this.handleLiveAppelEvent(created))
    );
  }

  /**
   * Retrieves all active pending alerts for waitstaff supervision.
   *
   * @returns Observable emitting array of active {@link TableAppel}.
   */
  getAppelsActifs(): Observable<TableAppel[]> {
    return this.http.get<TableAppel[]>(`${this.staffApi}/appels/actifs`).pipe(
      tap(appels => this.activeAppels.set(appels || []))
    );
  }

  /**
   * Retrieves active pending alerts for a specific table.
   *
   * @param tableId - Table identifier.
   * @returns Observable emitting array of active {@link TableAppel} for the table.
   */
  getAppelsActifsPourTable(tableId: number): Observable<TableAppel[]> {
    return this.http.get<TableAppel[]>(`${this.publicApi}/${tableId}/appels/actifs`);
  }

  /**
   * Acknowledges and dismisses a specific table alert.
   *
   * @param tableId - Table identifier.
   * @param appelId - Alert identifier.
   * @returns Observable emitting the updated {@link TableAppel}.
   */
  acquitterAppel(tableId: number, appelId: number): Observable<TableAppel> {
    return this.http.post<TableAppel>(`${this.staffApi}/${tableId}/appels/${appelId}/acquitter`, {}).pipe(
      tap(updated => this.handleLiveAppelEvent(updated))
    );
  }

  /**
   * Acknowledges and dismisses all active alerts for a table in one action.
   *
   * @param tableId - Table identifier.
   * @returns Observable emitting array of acknowledged {@link TableAppel}.
   */
  acquitterTousAppels(tableId: number): Observable<TableAppel[]> {
    return this.http.post<TableAppel[]>(`${this.staffApi}/${tableId}/appels/acquitter-tous`, {}).pipe(
      tap(() => {
        this.activeAppels.update(current => current.filter(a => a.tableId !== tableId));
      })
    );
  }

  /**
   * Checks whether a table currently has an active pending alert in memory.
   *
   * @param tableId - Table identifier.
   * @returns True if table has an active pending call, false otherwise.
   */
  hasActiveAppel(tableId: number): boolean {
    return this.activeAppels().some(a => a.tableId === tableId && a.statut === 'EN_ATTENTE');
  }

  /**
   * Returns the active alert type for a given table, or null if none.
   *
   * @param tableId - Table identifier.
   * @returns Active {@link TableAppelType} or null.
   */
  getActiveAppelType(tableId: number): TableAppelType | null {
    const found = this.activeAppels().find(a => a.tableId === tableId && a.statut === 'EN_ATTENTE');
    return found ? found.type : null;
  }
}
