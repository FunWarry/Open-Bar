import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslocoModule } from '@jsverse/transloco';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonRefresher,
  IonRefresherContent,
  IonGrid,
  IonRow,
  IonCol,
  ToastController
} from '@ionic/angular/standalone';
import { CommandeCardComponent } from './components/commande-card/commande-card.component';
import { StockAlertBannerComponent } from '../../core/components/stock-alert-banner/stock-alert-banner.component';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardBarmanService } from './services/dashboard-barman.service';
import { safeCompleteRefresher } from '../../core/utils/refresher-utils';
import { CommandeView } from './models/commande-view.model';

import { RoleBadgeComponent } from '../../core/components/ui/role-badge/role-badge.component';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { AppSettingsService } from '../../core/services/app-settings.service';

/**
 * Dashboard Barman Component managing real-time orders kanban (En attente, En préparation, Prêtes).
 * Aligned with Figma Vue Barman specs (`57:2`).
 */
@Component({
  selector: 'app-dashboard-barman',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    CommandeCardComponent,
    StockAlertBannerComponent,
    RoleBadgeComponent,
    EmptyStateComponent
  ],
  templateUrl: './dashboard-barman.component.html',
  styleUrls: ['./dashboard-barman.component.scss']
})
export class DashboardBarmanComponent implements OnInit, OnDestroy {
  commandesEnAttente: CommandeView[] = [];
  commandesEnPreparation: CommandeView[] = [];
  commandesPret: CommandeView[] = [];
  tempsAlerteCommandeMinutes = 5;

  private readonly destroy$ = new Subject<void>();

  get hasUrgentOrders(): boolean {
    const now = Date.now();
    const alertThresholdMs = (this.tempsAlerteCommandeMinutes || 5) * 60 * 1000;
    return this.commandesEnAttente.some((cmd) => {
      if (!cmd.dateCommande) return false;
      const created = new Date(cmd.dateCommande).getTime();
      return now - created > alertThresholdMs;
    });
  }

  constructor(
    private readonly dashboardService: DashboardBarmanService,
    private readonly toastCtrl: ToastController,
    private readonly notificationService: NotificationService,
    private readonly settingsService: AppSettingsService
  ) {}

  ngOnInit() {
    this.settingsService
      .getSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings) => {
          if (settings.tempsAlerteCommandeMinutes) {
            this.tempsAlerteCommandeMinutes = settings.tempsAlerteCommandeMinutes;
          }
        },
        error: () => {}
      });

    this.chargerCommandes();

    this.notificationService
      .onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe((notif) => {
        if (notif.type === 'commande' || notif.type === 'statut') {
          this.chargerCommandes();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  chargerCommandes() {
    forkJoin({
      enAttente: this.dashboardService.getCommandesEnAttente(),
      enPreparation: this.dashboardService.getCommandesEnPreparation(),
      pret: this.dashboardService.getCommandesPret()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ enAttente, enPreparation, pret }) => {
          this.commandesEnAttente = enAttente as CommandeView[];
          this.commandesEnPreparation = enPreparation as CommandeView[];
          this.commandesPret = pret as CommandeView[];
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du chargement des commandes',
            duration: 3000,
            color: 'danger'
          });
          toast.present();
        }
      });
  }

  async onChangerStatut(event: { id: number; statut: string }) {
    this.dashboardService
      .changerStatut(event.id, event.statut)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.chargerCommandes();
          const toast = await this.toastCtrl.create({
            message: 'Statut mis à jour',
            duration: 2000,
            color: 'success'
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Impossible de mettre à jour le statut',
            duration: 3000,
            color: 'danger'
          });
          toast.present();
        }
      });
  }

  onRefresh(event: any) {
    this.chargerCommandes();
    setTimeout(() => safeCompleteRefresher(event), 500);
  }

  trackById(_: number, cmd: CommandeView): number {
    return cmd.id;
  }
}
