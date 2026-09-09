import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import {
  IonContent,
  IonHeader,
  IonToolbar,
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
  IonSegment,
  IonSegmentButton,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  wineOutline,
  timeOutline,
  checkmarkDoneOutline,
  volumeHighOutline,
  volumeMuteOutline,
  flashOutline,
  refreshOutline,
  filterOutline,
  flameOutline,
  printOutline,
  restaurantOutline,
  listOutline,
  sparklesOutline,
  layersOutline,
  checkmarkCircleOutline,
  eyeOutline
} from 'ionicons/icons';
import { SearchBarComponent } from '../../core/components/ui/search-bar/search-bar.component';
import { CommandeCardComponent } from './components/commande-card/commande-card.component';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardBarmanService } from './services/dashboard-barman.service';
import { safeCompleteRefresher } from '../../core/utils/refresher-utils';
import { CommandeView, CommandeItemView } from './models/commande-view.model';
import { CocktailBatchView } from './models/batch-preparation.model';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { SoundService } from '../../core/services/sound.service';
import { RupturesModalComponent } from './components/ruptures-modal/ruptures-modal.component';
import { BarTicketPrintComponent } from './components/bar-ticket-print/bar-ticket-print.component';
import { RecipeSidePanelComponent } from './components/recipe-side-panel/recipe-side-panel.component';
import { Cocktail } from '../../core/models/cocktail.model';
import { WebSocketService } from '../../core/services/websocket.service';
import { FeatureFlagService } from '../../core/services/feature-flag.service';

/**
 * Dashboard Barman Component managing the real-time preparation Kanban board.
 * Equipped with live STOMP WebSocket sync, audio chimes, urgency threshold alerts,
 * instant out-of-stock toggles ("Quick Out-of-Stock"), 80mm thermal bar ticket printing,
 * an interactive preparation & recipe side panel, and an aggregated rush batching mode.
 */
@Component({
  selector: 'app-dashboard-barman',
  standalone: true,
  imports: [
    FormsModule,
    TranslocoModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    SearchBarComponent,
    IonChip,
    IonLabel,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    CommandeCardComponent,
    EmptyStateComponent,
    RecipeSidePanelComponent
],
  templateUrl: './dashboard-barman.component.html',
  styleUrls: ['./dashboard-barman.component.scss']
})
export class DashboardBarmanComponent implements OnInit, OnDestroy {
  commandesEnAttente: CommandeView[] = [];
  commandesEnPreparation: CommandeView[] = [];
  commandesPret: CommandeView[] = [];
  tempsAlerteWarningMinutes = 3;
  tempsAlerteCommandeMinutes = 5;
  tempsAlerteCritiqueCommandeMinutes = 10;

  searchQuery = '';
  urgentOnly = false;
  stationFilter: 'ALL' | 'BAR' | 'KITCHEN' = 'ALL';

  isRecipePanelOpen = false;
  activeRecipeItem: CommandeItemView | null = null;
  activeRecipeOrder: CommandeView | null = null;
  activeRecipeCocktail: Cocktail | null = null;
  isRecipeLoading = false;
  private readonly cachedCocktails: Map<string, Cocktail> = new Map();

  private readonly destroy$ = new Subject<void>();
  private readonly dashboardService = inject(DashboardBarmanService);
  private readonly toastCtrl = inject(ToastController);
  private readonly modalCtrl = inject(ModalController);
  private readonly notificationService = inject(NotificationService);
  private readonly settingsService = inject(AppSettingsService);
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly soundService = inject(SoundService);
  private readonly transloco = inject(TranslocoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly wsService = inject(WebSocketService);

  readonly cuisineKdsEnabled = this.featureFlagService.cuisineKdsEnabled;
  activeViewMode: 'tickets' | 'batch' = 'tickets';

  constructor() {
    addIcons({
      wineOutline,
      timeOutline,
      checkmarkDoneOutline,
      volumeHighOutline,
      volumeMuteOutline,
      flashOutline,
      refreshOutline,
      filterOutline,
      flameOutline,
      printOutline,
      restaurantOutline,
      listOutline,
      sparklesOutline,
      layersOutline,
      checkmarkCircleOutline,
      eyeOutline
    });
  }

  /**
   * Whether sound notifications are enabled.
   */
  get isSoundEnabled(): boolean {
    return this.soundService.isSoundEnabled();
  }

  /**
   * Evaluates if any pending order is currently past the urgency threshold.
   */
  get hasUrgentOrders(): boolean {
    return this.urgentOrdersCount > 0;
  }

  /**
   * Count of urgent pending orders.
   */
  get urgentOrdersCount(): number {
    const now = Date.now();
    const alertThresholdMs = (this.tempsAlerteCommandeMinutes || 5) * 60 * 1000;
    const maxActiveWindowMs = 2 * 60 * 60 * 1000;
    return this.commandesEnAttente.filter(cmd => {
      if (cmd.prioritaire) return true;
      if (!cmd.dateCommande) return false;
      const diff = now - new Date(cmd.dateCommande).getTime();
      return diff >= alertThresholdMs && diff < maxActiveWindowMs;
    }).length;
  }

  /**
   * Total count of active orders (pending + in preparation).
   */
  get totalActiveOrdersCount(): number {
    return this.commandesEnAttente.length + this.commandesEnPreparation.length;
  }

  /**
   * Filtered list of pending orders matching the active search and filter criteria.
   */
  get filteredCommandesEnAttente(): CommandeView[] {
    return this.applyFilters(this.commandesEnAttente);
  }

  /**
   * Filtered list of in-preparation orders matching the active search and filter criteria.
   */
  get filteredCommandesEnPreparation(): CommandeView[] {
    return this.applyFilters(this.commandesEnPreparation);
  }

  /**
   * Filtered list of ready orders matching the active search and filter criteria.
   */
  get filteredCommandesPret(): CommandeView[] {
    return this.applyFilters(this.commandesPret);
  }

  /**
   * Aggregated cocktail batches across active pending and in-progress orders.
   */
  get cocktailBatches(): CocktailBatchView[] {
    const alertThresholdMs = (this.tempsAlerteCommandeMinutes || 5) * 60 * 1000;
    return this.dashboardService.aggregateBatches(
      this.commandesEnAttente,
      this.commandesEnPreparation,
      {
        searchTerm: this.searchQuery,
        urgentOnly: this.urgentOnly,
        stationFilter: this.stationFilter,
        alertThresholdMs
      }
    );
  }

  /**
   * Batches having pending drinks awaiting preparation.
   */
  get pendingBatches(): CocktailBatchView[] {
    return this.cocktailBatches.filter(b => b.pendingQuantity > 0);
  }

  /**
   * Batches currently in preparation.
   */
  get inProgressBatches(): CocktailBatchView[] {
    return this.cocktailBatches.filter(b => b.preparingQuantity > 0);
  }

  /**
   * Total number of individual drinks to prepare across all aggregated batches.
   */
  get totalBatchDrinksCount(): number {
    return this.cocktailBatches.reduce((sum, b) => sum + b.totalQuantity, 0);
  }

  /**
   * Number of distinct cocktail recipes currently active in Rush Mode.
   */
  get distinctBatchRecipesCount(): number {
    return this.cocktailBatches.length;
  }

  /**
   * Number of urgent batches.
   */
  get urgentBatchesCount(): number {
    return this.cocktailBatches.filter(b => b.isUrgent).length;
  }

  ngOnInit(): void {
    this.settingsService
      .getSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: settings => {
          this.applyThresholdSettings(settings);
        },
        error: () => {}
      });

    this.settingsService.settings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        if (settings) {
          this.applyThresholdSettings(settings);
        }
      });

    this.chargerCommandes();

    this.notificationService
      .onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        if (notif.type === 'commande') {
          const commande = notif.data;
          if (commande && (commande.statut === 'ANNULEE' || commande.statut === 'REGLEE' || commande.statut === 'LIVREE')) {
            const id = Number(commande.id);
            this.commandesEnAttente = this.commandesEnAttente.filter(c => c.id !== id);
            this.commandesEnPreparation = this.commandesEnPreparation.filter(c => c.id !== id);
            this.commandesPret = this.commandesPret.filter(c => c.id !== id);
            this.cdr.detectChanges();
          } else {
            this.soundService.playNewOrderSound();
            this.chargerCommandes();
          }
        } else if (notif.type === 'statut') {
          const commande = notif.data;
          if (commande && (commande.statut === 'ANNULEE' || commande.statut === 'REGLEE' || commande.statut === 'LIVREE')) {
            const id = Number(commande.id);
            this.commandesEnAttente = this.commandesEnAttente.filter(c => c.id !== id);
            this.commandesEnPreparation = this.commandesEnPreparation.filter(c => c.id !== id);
            this.commandesPret = this.commandesPret.filter(c => c.id !== id);
            this.cdr.detectChanges();
          } else {
            this.chargerCommandes();
          }
        }
      });

    this.wsService
      .watch('/topic/barman/commandes')
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        try {
          const commande = JSON.parse(msg.body);
          if (commande.statut === 'ANNULEE' || commande.statut === 'REGLEE' || commande.statut === 'LIVREE') {
            const id = Number(commande.id);
            this.commandesEnAttente = this.commandesEnAttente.filter(c => c.id !== id);
            this.commandesEnPreparation = this.commandesEnPreparation.filter(c => c.id !== id);
            this.commandesPret = this.commandesPret.filter(c => c.id !== id);
            this.cdr.detectChanges();
          } else {
            this.chargerCommandes();
          }
        } catch {
          this.chargerCommandes();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads active orders for all three columns and notifies if new orders arrived.
   */
  chargerCommandes(): void {
    forkJoin({
      enAttente: this.dashboardService.getCommandesEnAttente(),
      enPreparation: this.dashboardService.getCommandesEnPreparation(),
      pret: this.dashboardService.getCommandesPret()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ enAttente, enPreparation, pret }) => {
          const previousCount = this.commandesEnAttente.length;
          this.commandesEnAttente = (enAttente || []).filter(c => c.statut === 'EN_ATTENTE' && c.items && c.items.length > 0);
          this.commandesEnPreparation = (enPreparation || []).filter(c => c.statut === 'EN_PREPARATION' && c.items && c.items.length > 0);
          this.commandesPret = (pret || []).filter(c => c.statut === 'PRET' && c.items && c.items.length > 0);

          if (enAttente.length > previousCount && previousCount > 0) {
            this.soundService.playNewOrderSound();
          }
          this.cdr.detectChanges();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('BARMAN_DASHBOARD.LOAD_ORDERS_ERROR'),
            duration: 3000,
            color: 'danger'
          });
          toast.present();
        }
      });
  }

  /**
   * Applies search string and urgency criteria to a list of orders.
   */
  private applyFilters(commandes: CommandeView[]): CommandeView[] {
    const q = this.searchQuery.toLowerCase().trim();
    const now = Date.now();
    const alertThresholdMs = (this.tempsAlerteCommandeMinutes || 5) * 60 * 1000;

    return commandes.filter(cmd => {
      // Urgent filter
      if (this.urgentOnly) {
        const isPrioritaire = Boolean(cmd.prioritaire);
        const diff = cmd.dateCommande ? now - new Date(cmd.dateCommande).getTime() : 0;
        const isPendingDelayed =
          cmd.statut === 'EN_ATTENTE' &&
          diff >= alertThresholdMs &&
          diff < 2 * 60 * 60 * 1000;
        const isUrgent = isPrioritaire || isPendingDelayed;
        if (!isUrgent) return false;
      }

      // Station filter
      if (this.stationFilter !== 'ALL') {
        const hasStationItem = cmd.items?.some(item => {
          const itemStation = item.station || 'BAR';
          if (this.stationFilter === 'KITCHEN') {
            return itemStation === 'KITCHEN' || itemStation === 'SNACK';
          }
          return itemStation === this.stationFilter;
        });
        if (!hasStationItem) return false;
      }

      // Search term filter
      if (!q) return true;

      const tableName = cmd.tableNom || (cmd.tableNumero ? `Table ${cmd.tableNumero}` : '');
      const matchesTable = tableName.toLowerCase().includes(q) || String(cmd.tableNumero || '').includes(q);;
      const matchesId = String(cmd.id).includes(q);
      const matchesServer =
        cmd.serveurNom?.toLowerCase().includes(q) ||
        cmd.serveurUsername?.toLowerCase().includes(q);
      const matchesItems = cmd.items?.some(item =>
        item.cocktailNom.toLowerCase().includes(q) ||
        item.varianteNom?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q)
      );

      return Boolean(matchesTable || matchesId || matchesServer || matchesItems);
    });
  }

  /**
   * Toggles sound notification setting.
   */
  toggleSound(): void {
    const state = this.soundService.toggleSound();
    const msg = state
      ? this.transloco.translate('BARMAN_DASHBOARD.SOUND_ALERTS_ENABLED')
      : this.transloco.translate('BARMAN_DASHBOARD.SOUND_ALERTS_DISABLED');
    this.showToast(msg, 'primary');
  }

  /**
   * Opens the Quick Out-of-Stock modal.
   */
  async openRupturesModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: RupturesModalComponent,
      cssClass: 'ruptures-modal-container'
    });
    await modal.present();
  }

  /**
   * Opens the 80mm thermal bar preparation receipt modal.
   */
  async onPrintTicket(cmd: CommandeView): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BarTicketPrintComponent,
      componentProps: { commande: cmd },
      cssClass: 'bar-ticket-modal-container'
    });
    await modal.present();
  }

  /**
   * Sets the active preparation workstation filter (ALL, BAR, KITCHEN).
   *
   * @param filter Selected station filter
   */
  setStationFilter(filter: 'ALL' | 'BAR' | 'KITCHEN'): void {
    this.stationFilter = filter;
  }

  /**
   * Updates order workflow status.
   */
  onChangerStatut(event: { id: number; statut: string }): void {
    this.dashboardService
      .changerStatut(event.id, event.statut)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.chargerCommandes();
          if (event.statut === 'PRET') {
            this.soundService.playOrderReadySound();
          }
          this.showToast(this.transloco.translate('BARMAN_DASHBOARD.STATUS_UPDATED_SUCCESS'), 'success');
        },
        error: () => {
          this.showToast(this.transloco.translate('BARMAN_DASHBOARD.STATUS_UPDATE_ERROR'), 'danger');
        }
      });
  }

  /**
   * Opens the detailed recipe and preparation side panel for an ordered drink.
   */
  onShowRecipe(event: { item: CommandeItemView; commande: CommandeView }): void {
    this.activeRecipeItem = event.item;
    this.activeRecipeOrder = event.commande;
    this.isRecipePanelOpen = true;

    if (this.cachedCocktails.has(event.item.cocktailNom)) {
      this.activeRecipeCocktail = this.cachedCocktails.get(event.item.cocktailNom) ?? null;
      this.isRecipeLoading = false;
      return;
    }

    if (event.item.cocktailId) {
      this.isRecipeLoading = true;
      this.dashboardService
        .getCocktailById(event.item.cocktailId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: cocktail => {
            this.activeRecipeCocktail = cocktail;
            this.cachedCocktails.set(event.item.cocktailNom, cocktail);
            this.isRecipeLoading = false;
          },
          error: () => {
            this.isRecipeLoading = false;
          }
        });
    } else {
      this.activeRecipeCocktail = null;
      this.isRecipeLoading = false;
    }
  }

  /**
   * Closes the recipe and preparation side panel.
   */
  onCloseRecipePanel(): void {
    this.isRecipePanelOpen = false;
  }

  onRefresh(event: any): void {
    this.chargerCommandes();
    setTimeout(() => safeCompleteRefresher(event), 500);
  }

  trackById(_: number, cmd: CommandeView): number {
    return cmd.id;
  }

  /**
   * Tracks batch items by cocktail name.
   */
  trackByBatchCocktail(_: number, batch: CocktailBatchView): string {
    return batch.cocktailNom;
  }

  /**
   * Advances all pending drinks in an aggregated batch to preparation status.
   *
   * @param batch Selected cocktail batch
   */
  onStartBatch(batch: CocktailBatchView): void {
    const pendingItems = batch.items.filter(it => it.statut !== 'EN_PREPARATION' && it.statut !== 'PRET');
    const itemIds = pendingItems.map(it => it.itemId);
    if (itemIds.length === 0) return;

    this.dashboardService
      .transitionBatch({ itemIds, statut: 'EN_PREPARATION' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.chargerCommandes();
          this.showToast(
            this.transloco.translate('BARMAN_DASHBOARD.BATCH_STARTED_SUCCESS', { name: batch.cocktailNom }),
            'primary'
          );
        },
        error: () => {
          this.showToast(this.transloco.translate('BARMAN_DASHBOARD.BATCH_ACTION_ERROR'), 'danger');
        }
      });
  }

  /**
   * Completes an aggregated batch by marking all its drinks as ready to serve.
   *
   * @param batch Selected cocktail batch
   */
  onCompleteBatch(batch: CocktailBatchView): void {
    const activeItems = batch.items.filter(it => it.statut !== 'PRET');
    const itemIds = activeItems.map(it => it.itemId);
    if (itemIds.length === 0) return;

    this.dashboardService
      .transitionBatch({ itemIds, statut: 'PRET' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.chargerCommandes();
          this.soundService.playOrderReadySound();
          this.showToast(
            this.transloco.translate('BARMAN_DASHBOARD.BATCH_COMPLETED_SUCCESS', { name: batch.cocktailNom }),
            'success'
          );
        },
        error: () => {
          this.showToast(this.transloco.translate('BARMAN_DASHBOARD.BATCH_ACTION_ERROR'), 'danger');
        }
      });
  }

  /**
   * Opens the recipe side panel scaled for the full aggregated batch quantity.
   *
   * @param batch Selected cocktail batch
   */
  onOpenBatchRecipe(batch: CocktailBatchView): void {
    const batchItem: CommandeItemView = {
      ...batch.sampleItem,
      quantite: batch.totalQuantity
    };
    this.onShowRecipe({ item: batchItem, commande: batch.sampleCommande });
  }

  private applyThresholdSettings(settings: any): void {
    if (settings?.tempsAlerteWarningMinutes) {
      this.tempsAlerteWarningMinutes = settings.tempsAlerteWarningMinutes;
    }
    if (settings?.tempsAlerteCommandeMinutes) {
      this.tempsAlerteCommandeMinutes = settings.tempsAlerteCommandeMinutes;
    }
    if (settings?.tempsAlerteCritiqueCommandeMinutes) {
      this.tempsAlerteCritiqueCommandeMinutes = settings.tempsAlerteCritiqueCommandeMinutes;
    }
    this.cdr.detectChanges();
  }

  private async showToast(message: string, color: 'primary' | 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color
    });
    toast.present();
  }
}
