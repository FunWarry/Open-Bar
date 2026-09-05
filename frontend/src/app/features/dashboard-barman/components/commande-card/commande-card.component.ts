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
import { TableDetailModalComponent } from '../../../dashboard-serveur/components/table-detail-modal/table-detail-modal.component';
import { TableView } from '../../../dashboard-serveur/models/table-view.model';
import { fastModalEnterAnimation, fastModalLeaveAnimation } from '../../../../core/utils/modal-animation.utils';
import { CommandeService } from '../../../../core/services/commande.service';

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
  @Input() tempsAlerteWarningMinutes = 3;
  @Input() tempsAlerteCommandeMinutes = 5;
  @Input() tempsAlerteCritiqueCommandeMinutes = 10;

  @Output() changerStatut = new EventEmitter<{ id: number; statut: string }>();
  @Output() printTicket = new EventEmitter<CommandeView>();
  @Output() showRecipe = new EventEmitter<{ item: CommandeItemView; commande: CommandeView }>();

  tempsEcoule = '00:00';
  isCritical = false;
  isUrgent = false;
  isWarning = false;

  private timerSub?: Subscription;
  private readonly commandeService = inject(CommandeService);

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
   * Opens the full table details modal with active orders list and actions.
   */
  async openDetails(): Promise<void> {
    if (!this.modalCtrl) return;

    const table: TableView = {
      id: this.commande.tableId ?? this.commande.tableNumero ?? 0,
      nom: this.commande.tableNom || `Table ${this.commande.tableNumero}`,
      zone: (this.commande as any).tableZone || (this.commande as any).zone || '',
      capacite: 4,
      occupee: true,
      serveurNom: this.commande.serveurNom || this.commande.serveurUsername,
      commandesActives: [],
    };

    const modal = await this.modalCtrl.create({
      component: TableDetailModalComponent,
      componentProps: {
        table,
      },
      cssClass: 'table-detail-modal-container',
      enterAnimation: fastModalEnterAnimation,
      leaveAnimation: fastModalLeaveAnimation,
    });

    document.body.classList.add('modal-open');
    modal.onDidDismiss().then(result => {
      document.body.classList.remove('modal-open');
      if (result.data) {
        if (result.data.action === 'statusUpdated' && result.data.targetStatut) {
          this.changerStatut.emit({ id: this.commande.id, statut: result.data.targetStatut });
        } else if (result.data.action === 'cancelled' || result.data.role === 'cancelled') {
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
   * Advances order status to Ready (PRET).
   */
  onMarquerPret(event?: Event): void {
    if (event) event.stopPropagation();
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

