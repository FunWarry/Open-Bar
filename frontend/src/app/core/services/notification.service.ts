import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WebSocketService } from './websocket.service';
import { SoundService } from './sound.service';

export interface AppNotification {
  id: string;
  type: 'commande' | 'statut' | 'table' | 'stock';
  message: string;
  severity: 'success' | 'warning' | 'danger' | 'primary';
  data?: any;
  timestamp: Date;
  lue: boolean;
}

/**
 * Service managing real-time notifications received via WebSocket STOMP.
 * Handles audio playback, unread count tracking, and notification history.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  /** Reactive state indicating whether the side notification drawer is open. */
  readonly isNotifPanelOpen = signal<boolean>(false);

  /** Reactive signal exposing the live count of unread notifications. */
  readonly unreadCount = signal<number>(0);

  private readonly notifications$ = new Subject<AppNotification>();
  private readonly stockAlerts$ = new Subject<AppNotification>();
  private readonly destroy$ = new Subject<void>();
  private readonly notificationHistory: AppNotification[] = [];
  private readonly orderStatusMap = new Map<number | string, string>();
  private readonly tableStatusMap = new Map<string, boolean>();
  private notifSequence = 0;

  constructor(
    private readonly ws: WebSocketService,
    private readonly soundService: SoundService
  ) {
    this.initSubscriptions();
  }

  /**
   * Toggles the open/closed state of the side notification drawer.
   */
  toggleNotifPanel(): void {
    this.isNotifPanelOpen.update(v => !v);
  }

  /**
   * Closes the side notification drawer.
   */
  closeNotifPanel(): void {
    this.isNotifPanelOpen.set(false);
  }

  /**
   * Opens the side notification drawer.
   */
  openNotifPanel(): void {
    this.isNotifPanelOpen.set(true);
  }

  private initSubscriptions(): void {
    // Order updates on /topic/commandes
    this.ws.watch('/topic/commandes')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
          this.handleOrderNotification(data);
        } catch {
          // malformed message — ignore
        }
      });

    // Order status updates on /topic/commandes/statut
    this.ws.watch('/topic/commandes/statut')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
          this.handleOrderNotification(data);
        } catch {
          // malformed message — ignore
        }
      });

    // Stock alerts on /topic/stock/alerte
    this.ws.watch('/topic/stock/alerte')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
          const nom = data.nom || data.nomIngredient || data.ingredientNom || 'Ingredient';
          const qty = data.quantiteActuelle ?? data.quantiteRestante ?? data.quantiteStock ?? data.stock ?? 0;
          const unite = data.uniteMesure || data.unite || '';
          const isCritical = Number(qty) <= 0;
          const labelPrefix = isCritical ? 'Out of Stock' : 'Low Stock';
          const unitStr = unite ? ` ${unite}` : '';
          const notif: AppNotification = {
            id: `stock-${Date.now()}-${++this.notifSequence}`,
            type: 'stock',
            message: `⚠ ${labelPrefix}: ${nom} (${qty}${unitStr} remaining)`,
            severity: isCritical ? 'danger' : 'warning',
            data,
            timestamp: new Date(),
            lue: false,
          };
          this.notificationHistory.unshift(notif);
          this.updateUnreadCount();
          this.stockAlerts$.next(notif);
          this.notifications$.next(notif);
        } catch {
          // malformed message — ignore
        }
      });

    // Table occupancy / release on /topic/tables
    this.ws.watch('/topic/tables')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
          const tableKey = String(data.nom ?? (data.id ? `id-${data.id}` : 'unknown'));
          const isOccupee = Boolean(data.occupee);
          if (this.tableStatusMap.has(tableKey) && this.tableStatusMap.get(tableKey) === isOccupee) {
            return; // Suppress duplicate table occupancy notification
          }
          this.tableStatusMap.set(tableKey, isOccupee);
          const tableDisplay = this.formatTableDisplay(tableKey);
          this.emit({
            type: 'table',
            message: `${tableDisplay} — ${isOccupee ? 'Occupied' : 'Available'}`,
            severity: 'success',
            data,
          });
        } catch {
          // malformed message — ignore
        }
      });
  }

  /**
   * Formats a table identifier or name into a user-friendly label.
   *
   * @param rawTable - Raw table name or identifier
   * @returns Formatted table display label
   */
  private formatTableDisplay(rawTable: any): string {
    if (!rawTable) return 'Table #';
    const nomStr = String(rawTable).trim();
    if (nomStr.toLowerCase().startsWith('table')) {
      return nomStr;
    }
    return `Table ${nomStr}`;
  }

  /**
   * Handles order WebSocket payloads with state tracking to prevent duplicate notifications.
   *
   * @param data - Raw or deserialized order data payload
   */
  private handleOrderNotification(data: any): void {
    if (!data) return;
    const orderId = data.id;
    const currentStatut = data.statut ?? 'EN_ATTENTE';
    const rawTableNom = data.tableNom ?? data.table?.nom ?? (data.table?.id ? `${data.table.id}` : null);
    const tableDisplay = this.formatTableDisplay(rawTableNom);

    if (orderId != null) {
      if (!this.orderStatusMap.has(orderId)) {
        // Initial new order event
        this.orderStatusMap.set(orderId, currentStatut);
        this.emit({
          type: 'commande',
          message: `New order — ${tableDisplay}`,
          severity: 'primary',
          data,
        });
        return;
      }

      const prevStatus = this.orderStatusMap.get(orderId);
      if (prevStatus !== currentStatut) {
        // Status transitioned to a new distinct state
        this.orderStatusMap.set(orderId, currentStatut);
        const severity = currentStatut === 'ANNULEE' ? 'danger' : 'success';
        this.emit({
          type: 'statut',
          message: `Order #${orderId} — ${currentStatut}`,
          severity,
          data,
        });
        return;
      }

      // Status has not changed (e.g. intermediate item additions or multiple topic delivery) — suppress
      return;
    }

    // Fallback if data doesn't have an order id
    this.emit({
      type: 'commande',
      message: `New order — ${tableDisplay}`,
      severity: 'primary',
      data,
    });
  }

  private emit(partial: Omit<AppNotification, 'id' | 'timestamp' | 'lue'>): void {
    const notif: AppNotification = {
      ...partial,
      id: `${partial.type}-${Date.now()}-${++this.notifSequence}`,
      timestamp: new Date(),
      lue: false,
    };
    this.notificationHistory.unshift(notif);
    this.updateUnreadCount();
    this.notifications$.next(notif);

    if (notif.data?.statut === 'PRET' || notif.data?.statut === 'PRETE') {
      this.soundService.playOrderReadySound();
    } else if (notif.type === 'commande') {
      this.soundService.playNewOrderSound();
    }
  }

  /**
   * Returns an Observable emitting all received notifications in real time.
   *
   * @returns Observable stream of {@link AppNotification}.
   */
  onNotification(): Observable<AppNotification> {
    return this.notifications$.asObservable();
  }

  /**
   * Returns an Observable emitting only stock alert notifications.
   *
   * @returns Observable stream of stock {@link AppNotification}.
   */
  onStockAlert(): Observable<AppNotification> {
    return this.stockAlerts$.asObservable();
  }

  /**
   * Returns a snapshot of the current notification history.
   *
   * @returns An array of {@link AppNotification}.
   */
  getHistory(): AppNotification[] {
    return [...this.notificationHistory];
  }

  /**
   * Marks a single notification as read by its unique ID and updates the unread count.
   *
   * @param id - Unique notification identifier.
   */
  marquerLue(id: string): void {
    const notif = this.notificationHistory.find(n => n.id === id);
    if (notif && !notif.lue) {
      notif.lue = true;
      this.updateUnreadCount();
    }
  }

  /**
   * Marks all notifications in history as read and resets the unread count.
   */
  marquerToutLu(): void {
    let changed = false;
    this.notificationHistory.forEach(n => {
      if (!n.lue) {
        n.lue = true;
        changed = true;
      }
    });
    if (changed || this.unreadCount() !== 0) {
      this.updateUnreadCount();
    }
  }

  /**
   * Returns the count of unread notifications from history.
   *
   * @returns Number of unread notifications.
   */
  getNonLues(): number {
    return this.notificationHistory.filter(n => !n.lue).length;
  }

  /**
   * Synchronizes the reactive {@link unreadCount} signal with the current count.
   */
  private updateUnreadCount(): void {
    this.unreadCount.set(this.getNonLues());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
