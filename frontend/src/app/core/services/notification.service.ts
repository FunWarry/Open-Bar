import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';
import { takeUntil } from 'rxjs/operators';
import { WebSocketService } from './websocket.service';

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
  private notifications$ = new Subject<AppNotification>();
  private stockAlerts$ = new Subject<AppNotification>();
  private readonly destroy$ = new Subject<void>();
  private notificationHistory: AppNotification[] = [];

  constructor(private readonly ws: WebSocketService,private readonly toastCtrl: ToastController,
  ) {
    this.initSubscriptions();
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
          const data = JSON.parse(msg.body);
          const isCritical = data.quantiteActuelle === 0;
          const notif: AppNotification = {
            id: `stock-${Date.now()}`,
            type: 'stock',
            message: isCritical
              ? `⚠ Critical Stock : ${data.nom} (${data.quantiteActuelle} restant)`
              : `⚠ Low Stock : ${data.nom} (${data.quantiteActuelle} restant)`,
            severity: 'warning',
            data,
            timestamp: new Date(),
            lue: false,
          };
          this.notificationHistory.unshift(notif);
          this.stockAlerts$.next(notif);
          this.showToast(notif.message, 'warning');
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
  }

  private async showToast(message: string, color: string): Promise<void> {
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
