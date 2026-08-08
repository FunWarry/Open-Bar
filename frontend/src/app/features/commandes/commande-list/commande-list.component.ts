import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin } from '../../../core/store/auth.selectors';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
  IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
  IonSpinner, IonSearchbar, IonToggle, IonChip, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eye, banOutline, gridOutline, listOutline, checkmarkDoneOutline,
  timeOutline, alertCircleOutline, playOutline, checkmarkCircleOutline,
  searchOutline, refreshOutline,
} from 'ionicons/icons';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { CommandeService } from '../../../core/services/commande.service';
import { Commande, CommandeStatut } from '../../../core/models/commande.model';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';

/**
 * Component responsible for managing and displaying active orders in real time.
 * Provides a dual view layout:
 * 1. A 4-column Kanban Board (Pending, In Progress, Ready to Serve, Served/Settled)
 *    matching the official OpenBar Figma design system.
 * 2. A detailed Table List View for search and audit.
 */
@Component({
  selector: 'app-commande-list',
  templateUrl: './commande-list.component.html',
  styleUrls: ['./commande-list.component.css'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
    IonSpinner, IonSearchbar, IonToggle, IonChip,
    CurrencyPipe, DatePipe, NgClass, TranslocoPipe,
  ],
})
export class CommandeListComponent implements OnInit, OnDestroy {
  commandes: Commande[] = [];
  filteredCommandes: Commande[] = [];

  /** Active display mode: 'kanban' or 'list' */
  viewMode: 'kanban' | 'list' = 'kanban';

  /** Whether served & settled orders are displayed in the Kanban view */
  showServed = false;

  /** Search query string filtering table numbers, server names, cocktail names or IDs */
  searchQuery = '';

  /** Selected status filter for the Table view */
  filtre: CommandeStatut | 'TOUTES' = 'TOUTES';

  isLoading = false;
  isAdmin$: Observable<boolean>;

  readonly statuts: Array<{ value: CommandeStatut | 'TOUTES'; labelKey: string }> = [
    { value: 'TOUTES',         labelKey: 'COMMANDES.STATUTS.TOUTES' },
    { value: 'EN_ATTENTE',     labelKey: 'COMMANDES.STATUTS.EN_ATTENTE' },
    { value: 'EN_PREPARATION', labelKey: 'COMMANDES.STATUTS.EN_PREPARATION' },
    { value: 'PRET',           labelKey: 'COMMANDES.STATUTS.PRET' },
    { value: 'LIVREE',         labelKey: 'COMMANDES.STATUTS.LIVREE' },
    { value: 'REGLEE',         labelKey: 'COMMANDES.STATUTS.REGLEE' },
    { value: 'ANNULEE',        labelKey: 'COMMANDES.STATUTS.ANNULEE' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly commandeService: CommandeService,
    private readonly toastCtrl: ToastController
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({
      eye, banOutline, gridOutline, listOutline, checkmarkDoneOutline,
      timeOutline, alertCircleOutline, playOutline, checkmarkCircleOutline,
      searchOutline, refreshOutline,
    });
  }

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetches all active and historic orders from the backend service.
   * @param refreshEvent Optional IonRefresher event context.
   */
  charger(refreshEvent?: any): void {
    this.isLoading = true;
    this.commandeService.getAll()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) safeCompleteRefresher(refreshEvent);
        }),
      )
      .subscribe({
        next: commandes => {
          this.commandes = commandes;
          this.appliquerFiltre();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du chargement des commandes',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  /**
   * Toggles view mode between 'kanban' and 'list'.
   */
  setViewMode(mode: 'kanban' | 'list'): void {
    this.viewMode = mode;
  }

  /**
   * Handles search query changes from the searchbar.
   */
  onSearchChange(event: any): void {
    this.searchQuery = event.detail.value ?? '';
    this.appliquerFiltre();
  }

  /**
   * Handles toggle switch change for showing served/settled orders.
   */
  onToggleShowServed(event: any): void {
    this.showServed = event.detail.checked;
    this.appliquerFiltre();
  }

  /**
   * Handles filter segment change in the table list view.
   */
  onFiltreChange(event: any): void {
    this.filtre = event.detail.value;
    this.appliquerFiltre();
  }

  /**
   * Filters orders based on current search query and status filters.
   */
  private appliquerFiltre(): void {
    let result = [...this.commandes];

    if (this.searchQuery.trim().length > 0) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        (c.tableNumero != null && ('table ' + c.tableNumero).toLowerCase().includes(q)) ||
        (c.tableNumero?.toString() || '').includes(q) ||
        (c.serveurUsername || '').toLowerCase().includes(q) ||
        (c.id?.toString() || '').includes(q) ||
        (c.trackingToken || '').toLowerCase().includes(q) ||
        c.items?.some(i => (i.cocktailNom || '').toLowerCase().includes(q))
      );
    }

    if (this.viewMode === 'list' && this.filtre !== 'TOUTES') {
      result = result.filter(c => c.statut === this.filtre);
    }

    this.filteredCommandes = result;
  }

  // --- Kanban Column Computed Getters ---

  get pendingOrders(): Commande[] {
    return this.filteredCommandes.filter(c => c.statut === 'EN_ATTENTE');
  }

  get inProgressOrders(): Commande[] {
    return this.filteredCommandes.filter(c => c.statut === 'EN_PREPARATION');
  }

  get readyOrders(): Commande[] {
    return this.filteredCommandes.filter(c => c.statut === 'PRET');
  }

  get servedOrders(): Commande[] {
    return this.filteredCommandes.filter(c => c.statut === 'LIVREE' || c.statut === 'REGLEE');
  }

  // --- Order Status Modifications ---

  /**
   * Updates an order's status to the next logical stage.
   * @param commande Target order.
   * @param nextStatut New status to apply.
   */
  onUpdateStatus(commande: Commande, nextStatut: CommandeStatut): void {
    this.commandeService.changerStatut(commande.id, nextStatut)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Statut de la commande mis à jour',
            duration: 2000,
            color: 'success',
          });
          toast.present();
          this.charger();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du changement de statut',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  /**
   * Cancels a pending or in-progress order.
   */
  onAnnuler(c: Commande): void {
    this.commandeService.annuler(c.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Commande annulée avec succès',
            duration: 2000,
            color: 'warning',
          });
          toast.present();
          this.charger();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Impossible d\'annuler cette commande',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  /**
   * Navigates to the detailed view of an order.
   */
  onView(c: Commande): void {
    this.router.navigate(['/commandes', c.id]);
  }

  // --- Helpers & Badges ---

  /**
   * Calculates elapsed minutes since the order was placed.
   */
  getDelayMinutes(dateCommande: string | Date | undefined): number {
    if (!dateCommande) return 0;
    const start = new Date(dateCommande).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.floor((now - start) / 60000));
  }

  /**
   * Determines if an order requires priority attention (pending > 10m or priority note).
   */
  isPriority(c: Commande): boolean {
    const delay = this.getDelayMinutes(c.dateCommande);
    const hasPriorityNote = c.notes != null && (
      c.notes.toLowerCase().includes('retard') ||
      c.notes.toLowerCase().includes('vip') ||
      c.notes.toLowerCase().includes('priorité')
    );
    return (c.statut === 'EN_ATTENTE' && delay >= 10) || hasPriorityNote;
  }

  /**
   * Returns Ionic badge color for order status.
   */
  getStatutColor(statut: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'warning',
      EN_PREPARATION: 'tertiary',
      PRET: 'success',
      LIVREE: 'medium',
      REGLEE: 'dark',
      ANNULEE: 'danger',
    };
    return map[statut] ?? 'primary';
  }

  /**
   * Determines if an order can still be cancelled.
   */
  peutAnnuler(statut: string): boolean {
    return !['LIVREE', 'REGLEE', 'ANNULEE'].includes(statut);
  }

  onRefresh(event: any): void {
    this.charger(event);
  }

  trackById(_: number, c: Commande): number {
    return c.id;
  }
}
