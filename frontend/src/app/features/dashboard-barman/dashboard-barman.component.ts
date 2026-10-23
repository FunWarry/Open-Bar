import { Component, OnInit, OnDestroy, Input, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, interval } from 'rxjs';
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
  IonLabel,
  IonSegment,
  IonSegmentButton,
  ModalController,
  ToastController
} from '@ionic/angular';
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
  eyeOutline,
  tvOutline,
  addCircleOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { SearchBarComponent } from '../../core/components/ui/search-bar/search-bar.component';
import { SafetyStaffModalComponent } from '../../core/components/ui/safety-staff-modal/safety-staff-modal.component';
import { SearchableSelectComponent, SearchableOption } from '../../core/components/ui/searchable-select/searchable-select.component';
import { CommandeCardComponent } from './components/commande-card/commande-card.component';
import { NotificationService, AppNotification } from '../../core/services/notification.service';
import { DashboardBarmanService } from './services/dashboard-barman.service';
import { safeCompleteRefresher } from '../../core/utils/refresher-utils';
import { CommandeView, CommandeItemView } from './models/commande-view.model';
import { CocktailBatchView } from './models/batch-preparation.model';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { SoundService } from '../../core/services/sound.service';
import { RupturesModalComponent } from './components/ruptures-modal/ruptures-modal.component';
import { QuickWasteLogModalComponent } from './components/quick-waste-log-modal/quick-waste-log-modal.component';
import { RuptureImpactModalComponent } from './components/rupture-impact-modal/rupture-impact-modal.component';
import { BarTicketPrintComponent } from './components/bar-ticket-print/bar-ticket-print.component';
import { RecipeSidePanelComponent } from './components/recipe-side-panel/recipe-side-panel.component';
import { Cocktail } from '../../core/models/cocktail.model';
import { Ingredient } from '../../core/models/ingredient.model';
import { StockMovement } from '../../core/models/stock-waste.model';
import { StockWasteService } from '../../core/services/stock-waste.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { FeatureFlagService } from '../../core/services/feature-flag.service';
import { RouletteService } from '../../core/services/roulette.service';
import { SafetyAlertBannerComponent } from '../../core/components/ui/safety-alert-banner/safety-alert-banner.component';
export type StationFilterType = 'ALL' | 'BAR' | 'KITCHEN';

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
    SearchableSelectComponent,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    CommandeCardComponent,
    EmptyStateComponent,
    RecipeSidePanelComponent,
    SafetyAlertBannerComponent,
    SafetyStaffModalComponent,
    RouterLink
],
  templateUrl: './dashboard-barman.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dashboard-barman.component.scss']
})
export class DashboardBarmanComponent implements OnInit, OnDestroy {
  @Input() isKitchenModeInput?: boolean;

  commandesEnAttente: CommandeView[] = [];
  commandesEnPreparation: CommandeView[] = [];
  commandesPret: CommandeView[] = [];
  tempsAlerteWarningMinutes = 3;
  tempsAlerteCommandeMinutes = 5;
  tempsAlerteCritiqueCommandeMinutes = 10;

  searchQuery = '';
  urgentOnly = false;
  stationFilter: StationFilterType = 'ALL';

  isRecipePanelOpen = false;
  activeRecipeItem: CommandeItemView | null = null;
  activeRecipeOrder: CommandeView | null = null;
  activeRecipeCocktail: Cocktail | null = null;
  isRecipeLoading = false;
  private readonly cachedCocktails: Map<string, Cocktail> = new Map();

  activeCriticalStockAlert: {
    ingredientId: number;
    nom: string;
    uniteMesure?: string;
    quantiteStock: number;
  } | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly dashboardService = inject(DashboardBarmanService);
  private readonly toastCtrl = inject(ToastController);
  private readonly modalCtrl = inject(ModalController);
  private readonly notificationService = inject(NotificationService);
  private readonly settingsService = inject(AppSettingsService);
  public readonly featureFlagService = inject(FeatureFlagService);
  private readonly stockWasteService = inject(StockWasteService);
  private readonly soundService = inject(SoundService);
  private readonly transloco = inject(TranslocoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly wsService = inject(WebSocketService);
  private readonly rouletteService = inject(RouletteService, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  readonly cuisineKdsEnabled = this.featureFlagService.cuisineKdsEnabled;
  activeViewMode: 'tickets' | 'batch' = 'tickets';
  /** Currently active column on mobile viewport (< 768px). */
  activeMobileTab: 'PENDING' | 'IN_PROGRESS' | 'READY' = 'PENDING';
  /** Currently active batch column on mobile viewport (< 768px). */
  activeBatchMobileTab: 'PENDING' | 'IN_PROGRESS' = 'PENDING';
  roulettePin = '7777';

  /**
   * Dropdown filter options for urgency state.
   */
  get urgentFilterOptions(): SearchableOption<boolean>[] {
    return [
      {
        value: false,
        label: this.transloco.translate('BARMAN_DASHBOARD.FILTER_ALL'),
        icon: 'list-outline'
      },
      {
        value: true,
        label: this.transloco.translate('BARMAN_DASHBOARD.FILTER_URGENT_ONLY'),
        icon: 'flash-outline',
        badge: this.urgentOrdersCount > 0 ? String(this.urgentOrdersCount) : undefined,
        badgeType: 'danger'
      }
    ];
  }

  /**
   * Dropdown filter options for station routing.
   */
  get stationFilterOptions(): SearchableOption<StationFilterType>[] {
    return [
      {
        value: 'ALL',
        label: this.transloco.translate('STATIONS.ALL'),
        icon: 'layers-outline'
      },
      {
        value: 'BAR',
        label: this.transloco.translate('STATIONS.BAR'),
        icon: 'wine-outline'
      },
      {
        value: 'KITCHEN',
        label: this.transloco.translate('STATIONS.KITCHEN'),
        icon: 'restaurant-outline'
      }
    ];
  }

  /**
   * Handles urgency filter dropdown change.
   *
   * @param val Selected value or option
   */
  onUrgentFilterChange(val: boolean | SearchableOption<boolean> | null | undefined): void {
    if (val === null || val === undefined) return;
    const isUrgent = typeof val === 'boolean' ? val : val.value;
    if (isUrgent !== undefined) {
      this.urgentOnly = isUrgent;
    }
  }

  /**
   * Handles station filter dropdown change.
   *
   * @param val Selected station or option
   */
  onStationFilterChange(val: StationFilterType | SearchableOption<StationFilterType> | null | undefined): void {
    if (!val) return;
    const station = typeof val === 'string' ? val : val.value;
    if (station) {
      this.stationFilter = station;
    }
  }


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
      eyeOutline,
      tvOutline,
      addCircleOutline,
      shieldCheckmarkOutline
    });
  }

  isSafetyMemoModalOpen = false;
  readonly angelShotEnabled = this.featureFlagService.angelShotSafetyEnabled;

  openSafetyMemoModal(): void {
    this.isSafetyMemoModalOpen = true;
  }

  closeSafetyMemoModal(): void {
    this.isSafetyMemoModalOpen = false;
  }

  /**
   * Returns whether this preparation workstation is running in Kitchen KDS mode.
   */
  get isKitchenMode(): boolean {
    if (this.isKitchenModeInput !== undefined) {
      return this.isKitchenModeInput;
    }
    const routeStation = this.route?.snapshot?.data?.['station'];
    if (routeStation === 'KITCHEN') {
      return true;
    }
    const url = this.router?.url || '';
    return url.includes('/kitchen') || url.includes('/cuisine') || url.includes('/kds');
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
    if (this.isKitchenMode) {
      this.stationFilter = 'KITCHEN';
    }

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

    if (!this.isKitchenMode && this.featureFlagService.mysteryRouletteEnabled() && this.rouletteService) {
      this.rouletteService.getDisplayPin()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res?.pin) {
              this.roulettePin = res.pin;
              this.cdr.markForCheck();
            }
          },
          error: () => {}
        });

      this.rouletteService.watchEvents()
        .pipe(takeUntil(this.destroy$))
        .subscribe(evt => {
          if (evt?.eventType === 'PIN_REVOKED') {
            this.rouletteService?.getDisplayPin()
              .pipe(takeUntil(this.destroy$))
              .subscribe(res => {
                if (res?.pin) {
                  this.roulettePin = res.pin;
                  this.cdr.markForCheck();
                }
              });
          }
        });
    }

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

    if (this.isKitchenMode) {
      this.wsService
        .watch('/topic/preparation/kitchen')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.chargerCommandes();
        });

      this.wsService
        .watch('/topic/preparation/snack')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.chargerCommandes();
        });
    }

    interval(15000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkUrgentOrdersAudio();
      });

    this.notificationService.onStockAlert()
      .pipe(takeUntil(this.destroy$))
      .subscribe((alert: AppNotification) => {
        const data = alert?.data;
        const qty = data?.quantiteRestante ?? data?.quantiteActuelle ?? data?.stock ?? 0;
        if (Number(qty) <= 0) {
          const ingredientId = data?.ingredientId ?? data?.id;
          const nom = data?.nomIngredient ?? data?.nom ?? 'Ingredient';
          const uniteMesure = data?.uniteMesure ?? data?.unite ?? '';
          if (ingredientId) {
            this.activeCriticalStockAlert = {
              ingredientId: Number(ingredientId),
              nom,
              uniteMesure,
              quantiteStock: Number(qty)
            };
            this.cdr.detectChanges();
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.soundService.clearAllUrgentOrders();
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
          this.checkUrgentOrdersAudio();
          this.cdr.detectChanges();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('BARMAN_DASHBOARD.LOAD_ORDERS_ERROR'),
            duration: 3000,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }

  /**
   * Evaluates pending orders against the critical wait time threshold (> 10 min without preparation)
   * and triggers audible rush urgency alerts via {@link SoundService}.
   */
  checkUrgentOrdersAudio(): void {
    const now = Date.now();
    const criticalThresholdMs = (this.tempsAlerteCritiqueCommandeMinutes || 10) * 60 * 1000;
    const maxActiveWindowMs = 2 * 60 * 60 * 1000;

    for (const cmd of this.commandesEnAttente) {
      if (cmd.dateCommande) {
        const diff = now - new Date(cmd.dateCommande).getTime();
        if (diff >= criticalThresholdMs && diff < maxActiveWindowMs) {
          this.soundService.triggerUrgentOrderAlert(cmd.id);
        }
      }
    }

    // Clear alerts for orders that have transitioned away from pending
    for (const cmd of [...this.commandesEnPreparation, ...this.commandesPret]) {
      this.soundService.clearUrgentOrder(cmd.id);
    }
  }

  /**
   * Applies search string and urgency criteria to a list of orders.
   */
  private applyFilters(commandes: CommandeView[]): CommandeView[] {
    const q = this.searchQuery.toLowerCase().trim();
    const now = Date.now();
    const alertThresholdMs = (this.tempsAlerteCommandeMinutes || 5) * 60 * 1000;

    return commandes.filter(cmd => {
      if (this.urgentOnly && !this.isCommandUrgent(cmd, now, alertThresholdMs)) {
        return false;
      }
      if (this.stationFilter !== 'ALL' && !this.matchesStation(cmd)) {
        return false;
      }
      if (q && !this.matchesCommandSearch(cmd, q)) {
        return false;
      }
      return true;
    });
  }

  private isCommandUrgent(cmd: CommandeView, now: number, alertThresholdMs: number): boolean {
    const isPrioritaire = Boolean(cmd.prioritaire);
    const diff = cmd.dateCommande ? now - new Date(cmd.dateCommande).getTime() : 0;
    const isPendingDelayed =
      cmd.statut === 'EN_ATTENTE' &&
      diff >= alertThresholdMs &&
      diff < 2 * 60 * 60 * 1000;
    return isPrioritaire || isPendingDelayed;
  }

  private matchesStation(cmd: CommandeView): boolean {
    return Boolean(cmd.items?.some(item => {
      const itemStation = item.station || 'BAR';
      if (this.stationFilter === 'KITCHEN') {
        return itemStation === 'KITCHEN' || itemStation === 'SNACK';
      }
      return itemStation === this.stationFilter;
    }));
  }

  private resolveCommandTableName(cmd: CommandeView): string {
    if (cmd.tableNom) return cmd.tableNom;
    if (cmd.tableNumero && cmd.barTabNom) return `Table ${cmd.tableNumero} • ${cmd.barTabNom}`;
    if (cmd.tableNumero) return `Table ${cmd.tableNumero}`;
    if (cmd.barTabNom) return `${cmd.barTabNom} (Bar)`;
    return 'Bar';
  }

  private matchesCommandSearch(cmd: CommandeView, q: string): boolean {
    const tableName = this.resolveCommandTableName(cmd);
    const matchesTable = tableName.toLowerCase().includes(q) ||
      String(cmd.tableNumero || '').includes(q) ||
      (cmd.barTabNom?.toLowerCase().includes(q) ?? false);
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
  }

  /**
   * Toggles sound notification setting.
   */
  toggleSound(): void {
    const state = this.soundService.toggleSound();
    const msg = state
      ? this.transloco.translate('BARMAN_DASHBOARD.SOUND_ALERTS_ENABLED')
      : this.transloco.translate('BARMAN_DASHBOARD.SOUND_ALERTS_DISABLED');
    void this.showToast(msg, 'primary');
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
   * Opens the high-speed waste, shrinkage, and tasting quick-log modal.
   */
  async openQuickWasteModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: QuickWasteLogModalComponent,
      cssClass: 'quick-waste-modal-container'
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.saved && data.movement) {
      await this.presentQuickWasteUndoToast(data.movement);
    }
  }

  /**
   * Displays immediate feedback toast with a 10-second undo button to revert the recorded shrinkage.
   *
   * @param movement Persisted stock movement
   */
  private async presentQuickWasteUndoToast(movement: StockMovement): Promise<void> {
    const reasonLabel = this.transloco.translate('STOCK.WASTE_REASON_' + movement.reason);
    const msg = this.transloco.translate('BARMAN_DASHBOARD.QUICK_WASTE_RECORDED_TOAST', {
      qty: movement.quantity,
      unit: movement.unit,
      name: movement.ingredientNom,
      reason: reasonLabel
    });

    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 10000,
      position: 'bottom',
      color: 'dark',
      cssClass: 'quick-waste-undo-toast',
      buttons: [
        {
          text: this.transloco.translate('COMMON.UNDO'),
          role: 'cancel',
          handler: () => {
            this.revertQuickWasteMovement(movement);
          }
        }
      ]
    });
    await toast.present();
  }

  /**
   * Reverts a recently logged stock waste movement via backend DELETE /api/stock/quick-log/{id}.
   *
   * @param movement Stock movement to revert
   */
  private revertQuickWasteMovement(movement: StockMovement): void {
    this.stockWasteService.revertQuickLog(movement.id).subscribe({
      next: async () => {
        const undoMsg = this.transloco.translate('BARMAN_DASHBOARD.QUICK_WASTE_UNDONE_TOAST', {
          name: movement.ingredientNom
        });
        const successToast = await this.toastCtrl.create({
          message: undoMsg,
          duration: 3000,
          color: 'success',
          position: 'bottom'
        });
        await successToast.present();
      },
      error: async () => {
        const errToast = await this.toastCtrl.create({
          message: this.transloco.translate('COMMON.ERROR'),
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await errToast.present();
      }
    });
  }

  /**
   * Opens the rupture impact verification modal from an active critical stock alert.
   */
  async openCriticalStockImpactModal(): Promise<void> {
    if (!this.activeCriticalStockAlert) return;
    const alertData = this.activeCriticalStockAlert;
    const ingredient: Ingredient = {
      id: alertData.ingredientId,
      nom: alertData.nom,
      uniteMesure: alertData.uniteMesure || '',
      quantiteStock: alertData.quantiteStock,
      seuilAlerte: 0,
      prixUnitaire: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const modal = await this.modalCtrl.create({
      component: RuptureImpactModalComponent,
      componentProps: {
        ingredient,
        source: 'automatic'
      },
      cssClass: 'rupture-impact-modal-container'
    });

    await modal.present();
    await modal.onDidDismiss();
    this.dismissCriticalStockAlert();
  }

  /**
   * Dismisses the active critical stock alert banner.
   */
  dismissCriticalStockAlert(): void {
    this.activeCriticalStockAlert = null;
    this.cdr.detectChanges();
  }

  /**
   * Opens the 80mm thermal bar preparation receipt modal.
   */
  async onPrintTicket(cmd: CommandeView): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BarTicketPrintComponent,
      componentProps: {
        commande: cmd,
        isKitchenMode: this.isKitchenMode,
        stationFilter: this.stationFilter
      },
      cssClass: 'modal-md bar-ticket-modal-container'
    });
    await modal.present();
  }

  /**
   * Sets the active preparation workstation filter (ALL, BAR, KITCHEN).
   *
   * @param filter Selected station filter
   */
  setStationFilter(filter: StationFilterType): void {
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
          if (event.statut === 'PRET' || event.statut === 'ANNULEE' || event.statut === 'LIVREE') {
            this.dashboardService.clearPreparedItems(event.id);
          }
          this.chargerCommandes();
          if (event.statut === 'PRET') {
            this.soundService.playOrderReadySound();
          }
          void this.showToast(this.transloco.translate('BARMAN_DASHBOARD.STATUS_UPDATED_SUCCESS'), 'success');
        },
        error: () => {
          void this.showToast(this.transloco.translate('BARMAN_DASHBOARD.STATUS_UPDATE_ERROR'), 'danger');
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
          void this.showToast(
            this.transloco.translate(this.isKitchenMode ? 'KDS.BATCH_STARTED_SUCCESS' : 'BARMAN_DASHBOARD.BATCH_STARTED_SUCCESS', { name: batch.cocktailNom }),
            'primary'
          );
        },
        error: () => {
          void this.showToast(this.transloco.translate('BARMAN_DASHBOARD.BATCH_ACTION_ERROR'), 'danger');
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
          void this.showToast(
            this.transloco.translate(this.isKitchenMode ? 'KDS.BATCH_COMPLETED_SUCCESS' : 'BARMAN_DASHBOARD.BATCH_COMPLETED_SUCCESS', { name: batch.cocktailNom }),
            'success'
          );
        },
        error: () => {
          void this.showToast(this.transloco.translate('BARMAN_DASHBOARD.BATCH_ACTION_ERROR'), 'danger');
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
    await toast.present();
  }
}
