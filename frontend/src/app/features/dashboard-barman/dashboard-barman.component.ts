import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
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
  IonSearchbar,
  IonChip,
  IonLabel,
  IonBadge,
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
  printOutline
} from 'ionicons/icons';
import { CommandeCardComponent } from './components/commande-card/commande-card.component';
import { NotificationService } from '../../core/services/notification.service';
import { DashboardBarmanService } from './services/dashboard-barman.service';
import { safeCompleteRefresher } from '../../core/utils/refresher-utils';
import { CommandeView, CommandeItemView } from './models/commande-view.model';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { SoundService } from '../../core/services/sound.service';
import { RupturesModalComponent } from './components/ruptures-modal/ruptures-modal.component';
import { BarTicketPrintComponent } from './components/bar-ticket-print/bar-ticket-print.component';
import { RecipeSidePanelComponent } from './components/recipe-side-panel/recipe-side-panel.component';
import { Cocktail } from '../../core/models/cocktail.model';

/**
 * Dashboard Barman Component managing the real-time preparation Kanban board.
 * Equipped with live STOMP WebSocket sync, audio chimes, urgency threshold alerts,
 * instant out-of-stock toggles ("Quick Out-of-Stock"), 80mm thermal bar ticket printing,
 * and an interactive preparation & recipe side panel.
 */
@Component({
  selector: 'app-dashboard-barman',
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
    IonSearchbar,
    IonChip,
    IonLabel,
    IonBadge,
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
  tempsAlerteCommandeMinutes = 5;

  searchQuery = '';
  urgentOnly = false;

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
  private readonly soundService = inject(SoundService);
  private readonly transloco = inject(TranslocoService);

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
      printOutline
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
    return this.commandesEnAttente.filter(cmd => {
      if (cmd.prioritaire) return true;
      if (!cmd.dateCommande) return false;
      const created = new Date(cmd.dateCommande).getTime();
      return now - created > alertThresholdMs;
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

  ngOnInit(): void {
    this.settingsService
      .getSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: settings => {
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
      .subscribe(notif => {
        if (notif.type === 'commande') {
          this.soundService.playNewOrderSound();
          this.chargerCommandes();
        } else if (notif.type === 'statut') {
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
          this.commandesEnAttente = enAttente;
          this.commandesEnPreparation = enPreparation;
          this.commandesPret = pret;

          if (enAttente.length > previousCount && previousCount > 0) {
            this.soundService.playNewOrderSound();
          }
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
        const isUrgent =
          cmd.prioritaire ||
          (cmd.dateCommande && now - new Date(cmd.dateCommande).getTime() > alertThresholdMs);
        if (!isUrgent) return false;
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

  private async showToast(message: string, color: 'primary' | 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color
    });
    toast.present();
  }
}
