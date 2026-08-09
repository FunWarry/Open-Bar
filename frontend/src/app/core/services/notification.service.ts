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
    // Nouvelle commande
    this.ws.watch('/topic/commandes')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data = JSON.parse(msg.body);
          this.emit({
            type: 'commande',
            message: `Nouvelle commande — Table ${data.tableNom ?? data.table?.nom ?? '#'}`,
            severity: 'primary',
            data,
          });
        } catch {
          // message malformé — on ignore
        }
      });

    // Changement de statut commande (topic générique)
    this.ws.watch('/topic/commandes/statut')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data = JSON.parse(msg.body);
          this.emit({
            type: 'statut',
            message: `Commande #${data.id} — ${data.statut ?? 'statut mis à jour'}`,
            severity: 'success',
            data,
          });
        } catch {
          // message malformé — on ignore
        }
      });

    // Alerte stock
    this.ws.watch('/topic/stock/alerte')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
          const nom = data.nom || data.nomIngredient || data.ingredientNom || 'Ingrédient';
          const qty = data.quantiteActuelle ?? data.quantiteRestante ?? data.quantiteStock ?? data.stock ?? 0;
          const unite = data.uniteMesure || data.unite || '';
          const isCritical = Number(qty) <= 0;
          const labelPrefix = isCritical ? 'Stock Épuisé' : 'Stock Faible';
          const unitStr = unite ? ` ${unite}` : '';
          const notif: AppNotification = {
            id: `stock-${Date.now()}`,
            type: 'stock',
            message: `⚠ ${labelPrefix} : ${nom} (${qty}${unitStr} restant)`,
            severity: isCritical ? 'danger' : 'warning',
            data,
            timestamp: new Date(),
            lue: false,
          };
          this.notificationHistory.unshift(notif);
          this.stockAlerts$.next(notif);
          this.showToast(notif.message, isCritical ? 'danger' : 'warning');
        } catch {
          // message malformé — on ignore
        }
      });

    // Occupation / libération d'une table
    this.ws.watch('/topic/tables')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const data = JSON.parse(msg.body);
          this.emit({
            type: 'table',
            message: `Table ${data.nom} — ${data.occupee ? 'Occupée' : 'Libérée'}`,
            severity: 'success',
            data,
          });
        } catch {
          // message malformé — on ignore
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
