import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, Optional, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  checkmarkCircleOutline,
  arrowForwardCircleOutline,
  flashOutline,
  printOutline,
  bookOutline,
  chevronDownOutline,
  chevronUpOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';
import { interval, Subscription } from 'rxjs';
import { CommandeView, CommandeItemView } from '../../models/commande-view.model';
import { groupCommandeItems } from '../../../../core/utils/order-item-grouper';
import { StatusBadgeComponent } from '../../../../core/components/ui/status-badge/status-badge.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { CommandeDetailModalComponent } from '../../../commandes/commande-detail-modal/commande-detail-modal.component';
import { BarTicketPrintComponent } from '../bar-ticket-print/bar-ticket-print.component';
import { DashboardBarmanService } from '../../services/dashboard-barman.service';
import { Cocktail } from '../../../../core/models/cocktail.model';

/**
 * Kanban order ticket card component for the bar counter preparation dashboard.
 * Features live countdowns/timers, color-shifting urgency, quick recipe sheet inspection,
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
    ActionButtonComponent
  ],
  templateUrl: './commande-card.component.html',
  styleUrls: ['./commande-card.component.scss']
})
export class CommandeCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) commande!: CommandeView;
  @Input() tempsAlerteCommandeMinutes = 5;

  @Output() changerStatut = new EventEmitter<{ id: number; statut: string }>();
  @Output() printTicket = new EventEmitter<CommandeView>();

  tempsEcoule = '00:00';
  isUrgent = false;
  isWarning = false;
  expandedRecipeItemIndex: number | null = null;
  loadedRecipeDetails: Map<string, Cocktail> = new Map();

  private timerSub?: Subscription;
  private readonly dashboardService = inject(DashboardBarmanService);

  get groupedItems(): CommandeItemView[] {
    return groupCommandeItems(this.commande?.items) as CommandeItemView[];
  }

  constructor(@Optional() private readonly modalCtrl?: ModalController) {
    addIcons({
      timeOutline,
      checkmarkCircleOutline,
      arrowForwardCircleOutline,
      flashOutline,
      printOutline,
      bookOutline,
      chevronDownOutline,
      chevronUpOutline,
      informationCircleOutline
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
   * Updates real-time elapsed timer and evaluates urgency thresholds.
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

    if (hours > 0) {
      this.tempsEcoule = `${hours}h${String(minutes % 60).padStart(2, '0')}`;
    } else {
      this.tempsEcoule = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    const thresholdMinutes = this.tempsAlerteCommandeMinutes || 5;
    this.isUrgent = minutes >= thresholdMinutes || this.commande.prioritaire;
    this.isWarning = minutes >= 3 && minutes < thresholdMinutes;
  }

  /**
   * Returns vertical status accent liseré color.
   */
  get lisereColor(): string {
    if (this.isUrgent) return 'var(--semantic-danger)';
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
   * Opens the full order details modal.
   */
  async openDetails(): Promise<void> {
    if (!this.modalCtrl) return;

    const modal = await this.modalCtrl.create({
      component: CommandeDetailModalComponent,
      componentProps: {
        commandeId: this.commande.id
      },
      cssClass: 'commande-detail-modal-container'
    });

    document.body.classList.add('modal-open');
    modal.onDidDismiss().then(result => {
      document.body.classList.remove('modal-open');
      if (result.data) {
        if (result.data.role === 'statusUpdated' && result.data.targetStatut) {
          this.changerStatut.emit({ id: this.commande.id, statut: result.data.targetStatut });
        } else if (result.data.role === 'cancelled') {
          this.changerStatut.emit({ id: this.commande.id, statut: 'ANNULEE' });
        }
      }
    });

    await modal.present();
  }

  /**
   * Opens the 80mm thermal bar preparation receipt modal.
   */
  async onPrintTicket(event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    this.printTicket.emit(this.commande);

    if (this.modalCtrl) {
      const modal = await this.modalCtrl.create({
        component: BarTicketPrintComponent,
        componentProps: {
          commande: this.commande
        },
        cssClass: 'bar-ticket-modal-container'
      });
      await modal.present();
    }
  }

  /**
   * Toggles recipe sheet expansion for a given cocktail item.
   */
  toggleRecipe(index: number, item: CommandeItemView, event?: Event): void {
    if (event) event.stopPropagation();

    if (this.expandedRecipeItemIndex === index) {
      this.expandedRecipeItemIndex = null;
      return;
    }

    this.expandedRecipeItemIndex = index;

    if (item.cocktailId && !this.loadedRecipeDetails.has(item.cocktailNom)) {
      this.dashboardService.getCocktailById(item.cocktailId).subscribe({
        next: cocktail => {
          this.loadedRecipeDetails.set(item.cocktailNom, cocktail);
        },
        error: () => {}
      });
    }
  }

  /**
   * Advances order status to In Preparation (EN_PREPARATION).
   */
  onPrendreEnCharge(event?: Event): void {
    if (event) event.stopPropagation();
    this.changerStatut.emit({ id: this.commande.id, statut: 'EN_PREPARATION' });
  }

  /**
   * Advances order status to Ready (PRET).
   */
  onMarquerPret(event?: Event): void {
    if (event) event.stopPropagation();
    this.changerStatut.emit({ id: this.commande.id, statut: 'PRET' });
  }
}

