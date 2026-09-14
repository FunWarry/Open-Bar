import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar,
  IonRefresher, IonRefresherContent,
  IonGrid, IonRow, IonCol,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonButton, IonIcon, IonSpinner, ToastController, ModalController
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { StatCardComponent } from '../../core/components/ui/stat-card/stat-card.component';
import { RoleBadgeComponent } from '../../core/components/ui/role-badge/role-badge.component';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { KanbanBoardComponent } from './components/kanban-board/kanban-board.component';
import { DashboardManagerService } from './services/dashboard-manager.service';
import { DashboardStats, TopCocktail } from './models/dashboard-stats.model';
import { OngoingOrder } from './models/ongoing-order.model';
import { NotificationService } from '../../core/services/notification.service';
import { safeCompleteRefresher } from '../../core/utils/refresher-utils';

import { addIcons } from 'ionicons';
import {
  peopleOutline,
  calendarOutline,
  settingsOutline,
  mapOutline,
  wineOutline,
  downloadOutline,
  refreshOutline,
  cashOutline,
  receiptOutline,
  restaurantOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  timeOutline,
  trendingUpOutline,
  statsChartOutline,
  warningOutline,
  syncOutline,
  eyeOutline,
  eyeOffOutline,
  timerOutline,
  arrowForwardOutline,
  calculatorOutline,
  trashOutline,
  pricetagOutline,
  giftOutline,
  cubeOutline,
  personCircleOutline,
  trendingDownOutline,
  chatbubbleEllipsesOutline,
  chevronForwardOutline,
  addCircleOutline,
  scaleOutline
} from 'ionicons/icons';
import { getMarginBadgeClass } from '../../core/utils/margin-calculation.util';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { StockWasteService } from '../../core/services/stock-waste.service';
import { StockMovement, StockWasteSummary, StockWasteReason } from '../../core/models/stock-waste.model';
import { StockWasteModalComponent } from '../ingredients/stock-waste-modal/stock-waste-modal.component';
import { AppCurrencyPipe } from '../../core/pipes/app-currency.pipe';

/**
 * Modernized Manager Dashboard Component.
 * Acts as the centralized nerve center and real-time operations monitor for bar managers.
 *
 * Features:
 * - Real-time financial & operational KPI cards (Revenue, Orders, Basket, Occupancy, Stock)
 * - Live WebSocket STOMP synchronization on order and stock events
 * - Workflow distribution and Kanban monitor
 * - Top daily cocktail sales analysis with animated progress tracks
 * - Operational alerts summary and quick managerial action shortcuts
 * - Daily CSV report export
 */
@Component({
  selector: 'app-dashboard-manager',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslocoPipe,
    IonContent, IonHeader, IonToolbar,
    IonRefresher, IonRefresherContent,
    IonGrid, IonRow, IonCol,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonButton, IonIcon, IonSpinner,
    StatCardComponent,
    RoleBadgeComponent,
    EmptyStateComponent,
    ActionButtonComponent,
    KanbanBoardComponent,
    AppCurrencyPipe,
  ],
  templateUrl: './dashboard-manager.component.html',
  styleUrls: ['./dashboard-manager.component.scss'],
})
export class DashboardManagerComponent implements OnInit, OnDestroy {
  /** Current consolidated dashboard metrics. */
  stats: DashboardStats | null = null;

  /** Active orders list. */
  ongoingOrders: OngoingOrder[] = [];

  /** Whether the delivered orders column is displayed in the Kanban board. */
  showDelivered = false;

  /** Whether the initial dashboard metrics are currently loading. */
  loading = true;

  /** Consolidated stock shrinkage and loss metrics. */
  wasteSummary: StockWasteSummary | null = null;

  /** Recent stock waste movements. */
  recentWasteMovements: StockMovement[] = [];

  /** Loading state for waste summary data. */
  loadingWaste = false;

  /** Timestamp of the latest metrics refresh. */
  lastUpdated: Date = new Date();

  private readonly destroy$ = new Subject<void>();

  /** Automatic polling interval (30s) as WebSocket fallback. */
  static readonly REFRESH_INTERVAL_MS = 30_000;

  constructor(
    private readonly dashboardService: DashboardManagerService,
    private readonly notificationService: NotificationService,
    private readonly toastController: ToastController,
    private readonly translocoService: TranslocoService,
    private readonly appSettingsService: AppSettingsService,
    private readonly stockWasteService: StockWasteService,
    private readonly modalController: ModalController,
  ) {
    addIcons({
      peopleOutline,
      calendarOutline,
      settingsOutline,
      mapOutline,
      wineOutline,
      downloadOutline,
      refreshOutline,
      cashOutline,
      receiptOutline,
      restaurantOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      timeOutline,
      trendingUpOutline,
      statsChartOutline,
      warningOutline,
      syncOutline,
      eyeOutline,
      eyeOffOutline,
      timerOutline,
      arrowForwardOutline,
      calculatorOutline,
      trashOutline,
      pricetagOutline,
      giftOutline,
      cubeOutline,
      personCircleOutline,
      trendingDownOutline,
      chatbubbleEllipsesOutline,
      chevronForwardOutline,
      addCircleOutline,
      scaleOutline
    });
  }

  getMarginBadgeClass(percentage: number | null | undefined): string {
    const target = this.appSettingsService?.targetGrossMarginPercentage ?? 70;
    const warning = this.appSettingsService?.warningGrossMarginPercentage ?? 50;
    return getMarginBadgeClass(percentage, target, warning);
  }

  get targetMargin(): number {
    return this.appSettingsService?.targetGrossMarginPercentage ?? 70;
  }

  get warningMargin(): number {
    return this.appSettingsService?.warningGrossMarginPercentage ?? 50;
  }

  /**
   * Toggles visibility of delivered orders column in Kanban.
   */
  toggleShowDelivered(): void {
    this.showDelivered = !this.showDelivered;
  }

  ngOnInit(): void {
    this.chargerStats();
    this.chargerOrders();
    this.chargerWasteSummary();
    this.setupWebSocketListeners();
    this.setupPeriodicPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Listens to live WebSocket STOMP events for order updates and stock alerts.
   */
  private setupWebSocketListeners(): void {
    this.notificationService.onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.chargerStatsSilent();
          this.chargerOrdersSilent();
        },
        error: () => {}
      });

    this.notificationService.onStockAlert()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.chargerStatsSilent();
          this.chargerWasteSummary();
        },
        error: () => {}
      });
  }

  /**
   * Sets up periodic background polling as a resilient fallback.
   */
  private setupPeriodicPolling(): void {
    timer(DashboardManagerComponent.REFRESH_INTERVAL_MS, DashboardManagerComponent.REFRESH_INTERVAL_MS).pipe(
      switchMap(() => this.dashboardService.getStats()),
      takeUntil(this.destroy$),
    ).subscribe({
      next: stats => {
        this.stats = stats;
        this.lastUpdated = new Date();
      },
      error: () => {},
    });

    timer(DashboardManagerComponent.REFRESH_INTERVAL_MS, DashboardManagerComponent.REFRESH_INTERVAL_MS).pipe(
      switchMap(() => this.dashboardService.getOngoingOrders()),
      takeUntil(this.destroy$),
    ).subscribe({
      next: orders => { this.ongoingOrders = orders; },
      error: () => {},
    });
  }

  /**
   * Loads statistics with loading state indicator.
   */
  chargerStats(): void {
    this.loading = true;
    this.dashboardService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.stats = stats;
          this.lastUpdated = new Date();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.stats = null;
        },
      });
  }

  /**
   * Silently refreshes statistics without triggering UI spinner flash.
   */
  chargerStatsSilent(): void {
    this.dashboardService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.stats = stats;
          this.lastUpdated = new Date();
        },
        error: () => {}
      });
  }

  /**
   * Loads ongoing orders list.
   */
  chargerOrders(): void {
    this.dashboardService.getOngoingOrders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: orders => { this.ongoingOrders = orders; },
        error: () => { this.ongoingOrders = []; },
      });
  }

  /**
   * Silently refreshes orders without UI reload.
   */
  chargerOrdersSilent(): void {
    this.dashboardService.getOngoingOrders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: orders => { this.ongoingOrders = orders; },
        error: () => {}
      });
  }

  /**
   * Pull-to-refresh / toolbar refresh handler.
   */
  onRefresh(event?: any): void {
    this.dashboardService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.stats = stats;
          this.lastUpdated = new Date();
          this.chargerOrders();
          this.chargerWasteSummary();
          if (event) {
            safeCompleteRefresher(event);
          }
        },
        error: () => {
          if (event) {
            safeCompleteRefresher(event);
          }
        },
      });
  }

  /**
   * Exports the current statistics to a downloadable CSV report file.
   */
  async onExportCsv(): Promise<void> {
    if (!this.stats) return;

    this.dashboardService.exportStatsCsv(this.stats);
    const toast = await this.toastController.create({
      message: this.translocoService.translate('MANAGER_DASHBOARD.EXPORT_SUCCESS'),
      duration: 3000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * Calculates average ticket basket amount in euros.
   */
  get averageTicket(): number {
    if (!this.stats || this.stats.commandesTotales <= 0 || !this.stats.chiffreAffairesJour) {
      return 0;
    }
    return Math.round((this.stats.chiffreAffairesJour / this.stats.commandesTotales) * 100) / 100;
  }

  /**
   * Calculates current table occupancy percentage.
   */
  get occupancyRate(): number {
    if (!this.stats || this.stats.tablesTotales <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((this.stats.tablesOccupees / this.stats.tablesTotales) * 100));
  }

  /**
   * Total number of active in-flight orders.
   */
  get activeOrdersCount(): number {
    if (!this.stats) return 0;
    return this.stats.commandesEnAttente + this.stats.commandesEnPreparation + this.stats.commandesPret;
  }

  /**
   * Calculates service delivery completion rate in percentage.
   */
  get deliveryRate(): number {
    if (!this.stats || this.stats.commandesTotales <= 0) {
      return 0;
    }
    return Math.round((this.stats.commandesLivrees / this.stats.commandesTotales) * 100);
  }

  /**
   * Total number of cocktails sold today across top ranks.
   */
  get totalCocktailsSold(): number {
    if (!this.stats?.topCocktails?.length) return 0;
    return this.stats.topCocktails.reduce((acc, c) => acc + c.nombreCommandes, 0);
  }

  /**
   * Formats a number as a currency string in EUR.
   */
  formatCurrency(val: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val ?? 0);
  }

  /**
   * Formats rank number with visual ordinal indicators.
   */
  getRankLabel(index: number): string {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  }

  /**
   * Calculates percentage bar width for cocktail popularity.
   */
  getBarWidth(cocktail: TopCocktail): number {
    if (!this.stats?.topCocktails?.length) return 0;
    const max = this.stats.topCocktails[0].nombreCommandes;
    if (max === 0) return 0;
    return Math.round((cocktail.nombreCommandes / max) * 100);
  }

  /**
   * Formatted time of the latest update.
   */
  get formattedLastUpdated(): string {
    return this.lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  trackByCocktailId(_: number, item: TopCocktail): number {
    return item.cocktailId;
  }

  /**
   * Loads consolidated stock waste figures and recent loss movements.
   */
  chargerWasteSummary(): void {
    this.loadingWaste = true;
    this.stockWasteService.getWasteSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: summary => {
          this.wasteSummary = summary;
          this.loadingWaste = false;
        },
        error: () => {
          this.loadingWaste = false;
        }
      });

    this.stockWasteService.getMovements()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: movements => {
          this.recentWasteMovements = movements.slice(0, 8);
        },
        error: () => {
          this.recentWasteMovements = [];
        }
      });
  }

  /**
   * Opens the stock waste declaration modal dialog.
   */
  async openStockWasteModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: StockWasteModalComponent,
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === 'saved') {
      this.chargerStatsSilent();
      this.chargerWasteSummary();
    }
  }

  /**
   * Opens the stock waste declaration modal (alias).
   */
  openWasteModal(): Promise<void> {
    return this.openStockWasteModal();
  }

  /** All stock waste reasons to display in audit breakdown. */
  readonly wasteReasons: StockWasteReason[] = [
    'CASSE',
    'PEREMPTION',
    'OFFERT_PATRON',
    'DEGUSTATION_STAFF',
    'ERREUR_PREPARATION'
  ];

  /**
   * Returns the monetary loss value for a specific waste reason.
   *
   * @param reason Declared shrinkage reason
   * @returns Financial loss amount
   */
  getReasonLossValue(reason: StockWasteReason): number {
    return this.wasteSummary?.lossValueByReason?.[reason] ?? 0;
  }

  /**
   * Returns the count of waste declarations for a specific waste reason.
   *
   * @param reason Declared shrinkage reason
   * @returns Count of declarations
   */
  getReasonCount(reason: StockWasteReason): number {
    return this.wasteSummary?.countByReason?.[reason] ?? 0;
  }

  /**
   * Calculates the percentage contribution of a specific waste reason to the total loss value.
   *
   * @param reason Target stock shrinkage reason
   * @returns Percentage integer between 0 and 100
   */
  getWasteReasonPercent(reason: StockWasteReason): number {
    if (!this.wasteSummary?.totalLossValue || this.wasteSummary.totalLossValue <= 0) {
      return 0;
    }
    const val = this.wasteSummary.lossValueByReason?.[reason] ?? 0;
    return Math.min(100, Math.round((val / this.wasteSummary.totalLossValue) * 100));
  }

  /**
   * Resolves the badge color for a declared waste reason.
   *
   * @param reason Declared reason
   * @returns Ionic color name
   */
  getWasteReasonBadgeColor(reason: StockWasteReason): string {
    switch (reason) {
      case 'CASSE':
        return 'danger';
      case 'PEREMPTION':
        return 'warning';
      case 'OFFERT_PATRON':
        return 'tertiary';
      case 'DEGUSTATION_STAFF':
        return 'primary';
      case 'ERREUR_PREPARATION':
        return 'medium';
      default:
        return 'secondary';
    }
  }

  /**
   * Resolves Transloco translation key for a declared waste reason.
   *
   * @param reason Declared reason
   * @returns Translation key string
   */
  getWasteReasonLabelKey(reason: StockWasteReason): string {
    return `STOCK.WASTE_REASON_${reason}`;
  }

  /**
   * Resolves Ionicon icon identifier for a declared waste reason.
   *
   * @param reason Declared reason
   * @returns Ionicon icon name string
   */
  getWasteReasonIcon(reason: StockWasteReason): string {
    switch (reason) {
      case 'CASSE':
        return 'wine-outline';
      case 'PEREMPTION':
        return 'time-outline';
      case 'OFFERT_PATRON':
        return 'gift-outline';
      case 'DEGUSTATION_STAFF':
        return 'people-outline';
      case 'ERREUR_PREPARATION':
        return 'warning-outline';
      default:
        return 'pricetag-outline';
    }
  }
}
