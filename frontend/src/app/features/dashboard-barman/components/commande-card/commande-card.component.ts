import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, Optional, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  checkmarkCircleOutline,
  checkmarkCircle,
  arrowForwardCircleOutline,
  flashOutline,
  printOutline,
  bookOutline,
  chevronDownOutline,
  chevronUpOutline,
  informationCircleOutline,
  checkmarkSharp
} from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';
import { interval, Subscription } from 'rxjs';
import { CommandeView, CommandeItemView } from '../../models/commande-view.model';
import { groupCommandeItems } from '../../../../core/utils/order-item-grouper';
import { StatusBadgeComponent } from '../../../../core/components/ui/status-badge/status-badge.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { CommandeDetailModalComponent } from '../../../commandes/commande-detail-modal/commande-detail-modal.component';
import { fastModalEnterAnimation, fastModalLeaveAnimation } from '../../../../core/utils/modal-animation.utils';
import { CommandeService } from '../../../../core/services/commande.service';
import { CardComponent } from '../../../../core/components/ui/card/card.component';
import { DashboardBarmanService } from '../../services/dashboard-barman.service';

/**
 * Kanban order ticket card component for the bar counter preparation dashboard.
 * Features live countdowns/timers, color-shifting urgency, quick recipe sheet inspection,
 * one-tap item-level prepared checkmarks with in-flight progress tracking,
 * and one-touch status advancement / 80mm thermal bar ticket printing.
 */
@Component({
  selector: 'app-commande-card',
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    TranslocoPipe,
    StatusBadgeComponent,
    ActionButtonComponent,
    CardComponent
  ],
  templateUrl: './commande-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./commande-card.component.scss']
})
export class CommandeCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) commande!: CommandeView;
  @Input() tempsAlerteWarningMinutes = 3;
  @Input() tempsAlerteCommandeMinutes = 5;
  @Input() tempsAlerteCritiqueCommandeMinutes = 10;
  @Input() stationFilter: 'ALL' | 'BAR' | 'KITCHEN' = 'ALL';
  @Input() isKitchenMode = false;

  @Output() changerStatut = new EventEmitter<{ id: number; statut: string }>();
  @Output() printTicket = new EventEmitter<CommandeView>();
  @Output() showRecipe = new EventEmitter<{ item: CommandeItemView; commande: CommandeView }>();

  tempsEcoule = '00:00';
  isCritical = false;
  isUrgent = false;
  isWarning = false;

  private timerSub?: Subscription;
  private readonly commandeService = inject(CommandeService);
  readonly dashboardBarmanService = inject(DashboardBarmanService);

  get groupedItems(): CommandeItemView[] {
    const rawItems = this.commande?.items || [];
    let items = rawItems;
    if (this.stationFilter === 'KITCHEN') {
      const kitchenItems = rawItems.filter(i => i.station === 'KITCHEN' || i.station === 'SNACK');
      if (kitchenItems.length > 0) {
        items = kitchenItems;
      }
    } else if (this.stationFilter === 'BAR') {
      const barItems = rawItems.filter(i => !i.station || i.station === 'BAR');
      if (barItems.length > 0) {
        items = barItems;
      }
    }
    return groupCommandeItems(items) as CommandeItemView[];
  }

  /**
   * Total drink portion quantity on this preparation card.
   */
  get totalItemsCount(): number {
    return this.groupedItems.reduce((acc, item) => acc + (item.quantite || 1), 0);
  }

  /**
   * Total number of drink portions currently marked as prepared on this card.
   */
  get preparedItemsCount(): number {
    return this.groupedItems.reduce((acc, item) => {
      return this.isItemPrepared(item) ? acc + (item.quantite || 1) : acc;
    }, 0);
  }

  /**
   * Indicates whether 100% of drink portions on this ticket are marked prepared.
   */
  get isAllItemsPrepared(): boolean {
    const total = this.totalItemsCount;
    return total > 0 && this.preparedItemsCount === total;
  }

  constructor(@Optional() private readonly modalCtrl?: ModalController) {
    addIcons({
      timeOutline,
      checkmarkCircleOutline,
      checkmarkCircle,
      arrowForwardCircleOutline,
      flashOutline,
      printOutline,
      bookOutline,
      chevronDownOutline,
      chevronUpOutline,
      informationCircleOutline,
      checkmarkSharp
    });
  }

  ngOnInit(): void {
    this.updateTimer();
    this.timerSub = interval(1000).subscribe(() => this.updateTimer());
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
  }

  /**
   * Checks whether a specific order line item is marked prepared.
   *
   * @param item CommandeItemView representation
   * @returns True if item is ready or locally marked prepared
   */
  isItemPrepared(item: CommandeItemView): boolean {
    if (this.commande.statut === 'PRET') return true;
    if (item.statut === 'PRET') return true;
    return this.dashboardBarmanService.isItemPrepared(this.commande.id, item.id, item.statut);
  }

  /**
   * Toggles the prepared completion checkmark for a given drink line item.
   *
   * @param item CommandeItemView to toggle
   * @param event DOM click event to stop card detail modal opening
   */
  toggleItemPrepared(item: CommandeItemView, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.commande.statut !== 'EN_PREPARATION') {
      return;
    }
    const matchingIds = this.getMatchingRawItemIds(item);
    const targetPrepared = !this.isItemPrepared(item);

    this.syncPreparedItemsState(matchingIds, targetPrepared, item.statut);
    this.updateInMemoryItemStatuses(item, matchingIds, targetPrepared);
  }

  /**
   * Synchronizes item state across matched raw items.
   */
  private syncPreparedItemsState(matchingIds: number[], targetPrepared: boolean, currentStatut?: string): void {
    for (const rawId of matchingIds) {
      const isSet = this.dashboardBarmanService.isItemPrepared(this.commande.id, rawId);
      if (isSet !== targetPrepared) {
        this.dashboardBarmanService.toggleItemPrepared(this.commande.id, rawId, currentStatut);
      }
    }
  }

  /**
   * Updates in-memory view items to reflect new status immediately.
   */
  private updateInMemoryItemStatuses(item: CommandeItemView, matchingIds: number[], targetPrepared: boolean): void {
    const nextStatus = targetPrepared ? 'PRET' : 'EN_PREPARATION';
    item.statut = nextStatus;
    if (this.commande.items) {
      for (const raw of this.commande.items) {
        if (matchingIds.includes(raw.id)) {
          raw.statut = nextStatus;
        }
      }
    }
  }

  /**
   * Resolves raw item IDs matching this grouped item line.
   *
   * @param item Grouped item line
   * @returns Array of raw item IDs
   */
  private getMatchingRawItemIds(item: CommandeItemView): number[] {
    if (!this.commande?.items || this.commande.items.length === 0) {
      return item.id ? [item.id] : [];
    }
    const matches = this.commande.items.filter(raw =>
      (raw.cocktailId ? raw.cocktailId === item.cocktailId : raw.cocktailNom === item.cocktailNom) &&
      (raw.varianteId ? raw.varianteId === item.varianteId : raw.varianteNom === item.varianteNom) &&
      ((raw.notes || '').trim().toLowerCase() === (item.notes || '').trim().toLowerCase())
    );
    const ids = matches.map(m => m.id).filter((id): id is number => typeof id === 'number');
    if (ids.length > 0) {
      return ids;
    }
    return item.id ? [item.id] : [];
  }

  /**
   * Updates real-time elapsed timer and evaluates multi-tier urgency thresholds.
   */
  private updateTimer(): void {
    if (!this.commande) return;

    const baseDate =
      this.commande.statut === 'EN_PREPARATION' && this.commande.datePreparation
        ? new Date(this.commande.datePreparation).getTime()
        : new Date(this.commande.dateCommande).getTime();

    if (Number.isNaN(baseDate)) {
      this.tempsEcoule = '00:00';
      return;
    }

    const diff = Math.max(0, Date.now() - baseDate);
    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(minutes / 60);

    if (hours > 24) {
      this.tempsEcoule = '+24h';
    } else if (hours > 0) {
      this.tempsEcoule = `${hours}h${String(minutes % 60).padStart(2, '0')}`;
    } else {
      this.tempsEcoule = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    const warningThreshold = this.tempsAlerteWarningMinutes || 3;
    const urgentThreshold = this.tempsAlerteCommandeMinutes || 5;
    const criticalThreshold = this.tempsAlerteCritiqueCommandeMinutes || 10;

    this.isCritical = minutes >= criticalThreshold;
    this.isUrgent = (minutes >= urgentThreshold && minutes < criticalThreshold) || (this.commande.prioritaire && !this.isCritical);
    this.isWarning = minutes >= warningThreshold && minutes < urgentThreshold && !this.commande.prioritaire;
  }

  /**
   * Returns vertical status accent border color.
   */
  get lisereColor(): string {
    if (this.isCritical || this.isUrgent) return 'var(--semantic-danger)';
    if (this.isWarning) return 'var(--semantic-warning)';
    switch (this.commande.statut) {
      case 'EN_ATTENTE':
        return 'var(--semantic-warning)';
      case 'EN_PREPARATION':
        return 'var(--semantic-info)';
      case 'PRET':
        return 'var(--semantic-success)';
      default:
        return 'var(--text-muted)';
    }
  }

  /**
   * Opens the full order details modal with item breakdown, recipe inspection, and status controls.
   */
  async openDetails(): Promise<void> {
    if (!this.modalCtrl) return;

    const modal = await this.modalCtrl.create({
      component: CommandeDetailModalComponent,
      componentProps: {
        commandeId: this.commande.id,
        commandeInput: this.commande as any,
      },
      cssClass: 'commande-detail-modal-container',
      enterAnimation: fastModalEnterAnimation,
      leaveAnimation: fastModalLeaveAnimation,
    });

    document.body.classList.add('modal-open');
    void modal.onDidDismiss().then(result => {
      document.body.classList.remove('modal-open');
      if (result.data) {
        const targetStatut = result.data.targetStatut || (result.data.role === 'statusUpdated' ? result.data.commande?.statut : undefined);
        if ((result.data.action === 'statusUpdated' || result.data.role === 'statusUpdated') && targetStatut) {
          if (targetStatut === 'PRET' || targetStatut === 'ANNULEE' || targetStatut === 'LIVREE') {
            this.dashboardBarmanService.clearPreparedItems(this.commande.id);
          }
          this.changerStatut.emit({ id: this.commande.id, statut: targetStatut });
        } else if (result.data.action === 'cancelled' || result.data.role === 'cancelled') {
          this.dashboardBarmanService.clearPreparedItems(this.commande.id);
          this.changerStatut.emit({ id: this.commande.id, statut: 'ANNULEE' });
        }
      }
    });

    await modal.present();
  }

  /**
   * Emits event to open the 80mm thermal bar preparation receipt modal.
   */
  onPrintTicket(event?: Event): void {
    if (event) event.stopPropagation();
    this.printTicket.emit(this.commande);
  }

  /**
   * Emits event to open the detailed recipe and preparation side panel.
   */
  onOpenRecipe(item: CommandeItemView, event?: Event): void {
    if (event) event.stopPropagation();
    this.showRecipe.emit({ item, commande: this.commande });
  }

  /**
   * Advances order status to In Preparation (EN_PREPARATION).
   */
  onPrendreEnCharge(event?: Event): void {
    if (event) event.stopPropagation();
    this.changerStatut.emit({ id: this.commande.id, statut: 'EN_PREPARATION' });
  }

  /**
   * Advances order status to Ready (PRET) and clears in-flight checklist.
   */
  onMarquerPret(event?: Event): void {
    if (event) event.stopPropagation();
    this.dashboardBarmanService.clearPreparedItems(this.commande.id);
    this.changerStatut.emit({ id: this.commande.id, statut: 'PRET' });
  }

  /**
   * Toggles urgent / priority state for this order.
   */
  onToggleUrgent(event?: Event): void {
    if (event) event.stopPropagation();
    this.commandeService.toggleUrgent(this.commande.id).subscribe({
      next: (updated) => {
        this.commande.prioritaire = updated.prioritaire ?? false;
        this.updateTimer();
      }
    });
  }
}

