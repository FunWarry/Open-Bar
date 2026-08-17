import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';
import { takeUntil } from 'rxjs/operators';
import { WebSocketService } from './websocket.service';
import { SoundService } from './sound.service';
import { PreferencesService } from './preferences.service';

export interface AppNotification {
  id: string;
  type: 'commande' | 'statut' | 'table' | 'stock';
  message: string;
  severity: 'success' | 'warning' | 'danger' | 'primary';
  data?: any;
  timestamp: Date;
  lue: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  readonly isNotifPanelOpen = signal<boolean>(false);
  private readonly notifications$ = new Subject<AppNotification>();
  private readonly stockAlerts$ = new Subject<AppNotification>();
  private readonly destroy$ = new Subject<void>();
  private readonly notificationHistory: AppNotification[] = [];

  private readonly prefs = inject(PreferencesService);

  constructor(
    private readonly ws: WebSocketService,
    private readonly toastCtrl: ToastController,
    private readonly soundService: SoundService
  ) {
    this.initSubscriptions();
  }

  toggleNotifPanel(): void {
    this.isNotifPanelOpen.update(v => !v);
  }

  closeNotifPanel(): void {
    this.isNotifPanelOpen.set(false);
  }

  openNotifPanel(): void {
    this.isNotifPanelOpen.set(true);
  }

  private initSubscriptions(): void {
    this.subscribeToTopic('/topic/commandes', 'commande', 'primary', d => `New order — Table ${d.tableNom ?? d.table?.nom ?? '#'}`);
    this.subscribeToTopic('/topic/commandes/statut', 'statut', 'success', d => `Order #${d.id} — ${d.statut ?? 'status updated'}`);
    this.subscribeToTopic('/topic/barman/commandes', 'commande', 'primary', d => `Order #${d.id} — ${d.statut ?? 'updated'}`);

    // Stock alert
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
            id: `stock-${Date.now()}`,
            type: 'stock',
            message: `⚠ ${labelPrefix}: ${nom} (${qty}${unitStr} remaining)`,
            severity: isCritical ? 'danger' : 'warning',
            data,
            timestamp: new Date(),
            lue: false,
          };
          this.notificationHistory.unshift(notif);
          this.stockAlerts$.next(notif);
          this.notifications$.next(notif);
          this.showToast(notif.message, isCritical ? 'danger' : 'warning');
        } catch {
          // malformed message — ignore
        }
      });

    // Table occupancy / release
    this.ws.watch('/topic/tables')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data = JSON.parse(msg.body);
          this.emit({
            type: 'table',
            message: `Table ${data.nom} — ${data.occupee ? 'Occupied' : 'Available'}`,
            severity: 'success',
            data,
          });
        } catch {
          // malformed message — ignore
        }
      });
  }

  private emit(partial: Omit<AppNotification, 'id' | 'timestamp' | 'lue'>): void {
    const notif: AppNotification = {
      ...partial,
      id: `${partial.type}-${Date.now()}`,
      timestamp: new Date(),
      lue: false,
    };
    this.notificationHistory.unshift(notif);
    this.notifications$.next(notif);
    this.showToast(notif.message, notif.severity);

    if (notif.type === 'commande') {
      this.soundService.playNewOrderSound();
    } else if (notif.type === 'statut' && (notif.data?.statut === 'PRET' || notif.data?.statut === 'PRETE')) {
      this.soundService.playOrderReadySound();
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    if (!this.prefs.visualNotifEnabled()) return;
    const toast = await this.toastCtrl.create({
      message,
      duration: 4000,
      color,
      position: 'top',
      buttons: [{ text: '×', role: 'cancel' }],
    });
    await toast.present();
  }

  private subscribeToTopic(
    topic: string,
    type: 'commande' | 'statut',
    severity: 'primary' | 'success',
    getMessage: (d: any) => string,
  ): void {
    this.ws.watch(topic)
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data = JSON.parse(msg.body);
          this.emit({
            type,
            message: getMessage(data),
            severity,
            data,
          });
        } catch {
          // malformed message — ignore
        }
      });
  }

  onNotification(): Observable<AppNotification> {
    return this.notifications$.asObservable();
  }

  onStockAlert(): Observable<AppNotification> {
    return this.stockAlerts$.asObservable();
  }

  getHistory(): AppNotification[] {
    return [...this.notificationHistory];
  }

  marquerLue(id: string): void {
    const notif = this.notificationHistory.find(n => n.id === id);
    if (notif) notif.lue = true;
  }

  marquerToutLu(): void {
    this.notificationHistory.forEach(n => (n.lue = true));
  }

  getNonLues(): number {
    return this.notificationHistory.filter(n => !n.lue).length;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
