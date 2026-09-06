import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, interval, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonGrid,
  IonRow,
  IonCol,
  IonChip,
  IonLabel,
  IonBadge,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  restaurantOutline,
  timeOutline,
  checkmarkCircleOutline,
  arrowForwardCircleOutline,
  volumeHighOutline,
  volumeMuteOutline,
  flashOutline,
  refreshOutline,
  pizzaOutline,
  checkmarkDoneOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { DashboardBarmanService } from '../dashboard-barman/services/dashboard-barman.service';
import { CommandeView, CommandeItemView } from '../dashboard-barman/models/commande-view.model';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { SoundService } from '../../core/services/sound.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { safeCompleteRefresher } from '../../core/utils/refresher-utils';

/**
 * Dedicated lightweight Kitchen Display Screen (KDS) component.
 * Tailored for kitchen and snack food preparation stations with independent
 * item-level preparation progression, real-time STOMP topic routing,
 * elapsed order timers, and audible alerts.
 */
@Component({
  selector: 'app-kds-kitchen',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    IonChip,
    IonLabel,
    IonBadge,
    EmptyStateComponent,
    ActionButtonComponent
  ],
  templateUrl: './kds-kitchen.component.html',
  styleUrls: ['./kds-kitchen.component.scss']
})
export class KdsKitchenComponent implements OnInit, OnDestroy {
  commandes: CommandeView[] = [];
  activeFilter: 'ACTIVE' | 'ALL' | 'READY' = 'ACTIVE';

  private readonly destroy$ = new Subject<void>();
  private timerSub?: Subscription;

  private readonly dashboardService = inject(DashboardBarmanService);
  private readonly toastCtrl = inject(ToastController);
  private readonly soundService = inject(SoundService);
  private readonly transloco = inject(TranslocoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly wsService = inject(WebSocketService);

  constructor() {
    addIcons({
      restaurantOutline,
      timeOutline,
      checkmarkCircleOutline,
      arrowForwardCircleOutline,
      volumeHighOutline,
      volumeMuteOutline,
      flashOutline,
      refreshOutline,
      pizzaOutline,
      checkmarkDoneOutline,
      alertCircleOutline
    });
  }

  /**
   * Whether audio chimes are enabled.
   */
  get isSoundEnabled(): boolean {
    return this.soundService.isSoundEnabled();
  }

  /**
   * Filtered list of kitchen tickets according to the selected view mode.
   */
  get filteredCommandes(): CommandeView[] {
    const kitchenOrders = this.commandes.filter(cmd =>
      cmd.items?.some(item => this.isKitchenItem(item))
    );

    if (this.activeFilter === 'ACTIVE') {
      return kitchenOrders.filter(cmd => cmd.statut === 'EN_ATTENTE' || cmd.statut === 'EN_PREPARATION');
    }
    if (this.activeFilter === 'READY') {
      return kitchenOrders.filter(cmd => cmd.statut === 'PRET');
    }
    return kitchenOrders;
  }

  /**
   * Count of active kitchen orders (pending or in preparation).
   */
  get activeKitchenOrdersCount(): number {
    return this.commandes.filter(
      cmd => (cmd.statut === 'EN_ATTENTE' || cmd.statut === 'EN_PREPARATION') &&
             cmd.items?.some(it => this.isKitchenItem(it))
    ).length;
  }

  /**
   * Count of items pending preparation across all active kitchen orders.
   */
  get pendingItemsCount(): number {
    let count = 0;
    for (const cmd of this.commandes) {
      if (cmd.statut === 'EN_ATTENTE' || cmd.statut === 'EN_PREPARATION') {
        for (const it of cmd.items || []) {
          if (this.isKitchenItem(it) && it.statut !== 'PRET' && it.statut !== 'LIVREE') {
            count += it.quantite;
          }
        }
      }
    }
    return count;
  }

  ngOnInit(): void {
    this.chargerCommandes();

    // Elapsed timer tick every second
    this.timerSub = interval(1000).subscribe(() => {
      this.cdr.markForCheck();
    });

    // Real-time STOMP subscription on dedicated kitchen preparation topic
    this.wsService
      .watch('/topic/preparation/kitchen')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.chargerCommandes(true);
      });

    // Fallback broadcast listener on main orders topic
    this.wsService
      .watch('/topic/commandes')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.chargerCommandes(false);
      });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Checks whether an order item belongs to Kitchen or Snack preparation stations.
   *
   * @param item Order line item
   * @returns True if item is routed to kitchen or snack
   */
  isKitchenItem(item: CommandeItemView): boolean {
    return item.station === 'KITCHEN' || item.station === 'SNACK';
  }

  /**
   * Filters an order's items to return only kitchen/snack routed items.
   *
   * @param items Full order items list
   * @returns Items meant for food stations
   */
  getKitchenItems(items: CommandeItemView[]): CommandeItemView[] {
    return (items || []).filter(item => this.isKitchenItem(item));
  }

  /**
   * Loads active orders for kitchen workstation.
   *
   * @param playSoundOnNew True to chime audio if new orders arrived
   */
  chargerCommandes(playSoundOnNew = false): void {
    forkJoin({
      enAttente: this.dashboardService.getCommandesEnAttente(),
      enPreparation: this.dashboardService.getCommandesEnPreparation(),
      pret: this.dashboardService.getCommandesPret()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ enAttente, enPreparation, pret }) => {
          const previousCount = this.activeKitchenOrdersCount;
          const combined = [...(enAttente || []), ...(enPreparation || []), ...(pret || [])];
          this.commandes = combined;

          if (playSoundOnNew && this.activeKitchenOrdersCount > previousCount && previousCount > 0) {
            this.soundService.playNewOrderSound();
          }
          this.cdr.markForCheck();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('KDS.LOAD_ERROR'),
            duration: 3000,
            color: 'danger'
          });
          toast.present();
        }
      });
  }

  /**
   * Pull-to-refresh handler.
   */
  onRefresh(event: any): void {
    this.chargerCommandes();
    safeCompleteRefresher(event);
  }

  /**
   * Toggles sound alerts.
   */
  toggleSound(): void {
    const enabled = this.soundService.toggleSound();
    const msg = enabled
      ? this.transloco.translate('BARMAN_DASHBOARD.SOUND_ALERTS_ENABLED')
      : this.transloco.translate('BARMAN_DASHBOARD.SOUND_ALERTS_DISABLED');
    this.showToast(msg, 'primary');
  }

  /**
   * Advances individual item preparation status (e.g. EN_ATTENTE -> EN_PREPARATION -> PRET).
   *
   * @param commande Parent order view
   * @param item Target line item
   * @param targetStatut Target status string
   */
  onAdvanceItemStatut(commande: CommandeView, item: CommandeItemView, targetStatut: string): void {
    this.dashboardService
      .changerItemStatut(commande.id, item.id, targetStatut)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          item.statut = targetStatut as any;
          this.chargerCommandes();
          if (targetStatut === 'PRET') {
            this.soundService.playOrderReadySound();
          }
          this.showToast(this.transloco.translate('KDS.ITEM_STATUS_UPDATED'), 'success');
        },
        error: () => {
          this.showToast(this.transloco.translate('BARMAN_DASHBOARD.STATUS_UPDATE_ERROR'), 'danger');
        }
      });
  }

  /**
   * Marks all kitchen items in an order as READY (PRET).
   *
   * @param commande Order to mark ready
   */
  onMarkOrderReady(commande: CommandeView): void {
    this.dashboardService
      .changerStatut(commande.id, 'PRET')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.chargerCommandes();
          this.soundService.playOrderReadySound();
          this.showToast(this.transloco.translate('BARMAN_DASHBOARD.STATUS_UPDATED_SUCCESS'), 'success');
        },
        error: () => {
          this.showToast(this.transloco.translate('BARMAN_DASHBOARD.STATUS_UPDATE_ERROR'), 'danger');
        }
      });
  }

  /**
   * Calculates formatted elapsed time for an order ticket.
   *
   * @param dateString ISO creation or preparation date
   * @returns MM:SS string
   */
  formatElapsedTime(dateString: Date | string | undefined): string {
    if (!dateString) return '00:00';
    const start = new Date(dateString).getTime();
    if (Number.isNaN(start)) return '00:00';
    const diff = Math.max(0, Date.now() - start);
    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'primary' = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
