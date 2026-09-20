import { Component, Input, Output, EventEmitter, Optional, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  IonIcon, IonButton, ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  eye, banOutline, playOutline, checkmarkCircleOutline,
  checkmarkDoneOutline, timeOutline, alertCircleOutline,
  arrowForwardCircleOutline,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Commande, CommandeStatut } from '../../../core/models/commande.model';
import { CancelOrderModalComponent } from '../../../core/components/ui/cancel-order-modal/cancel-order-modal.component';
import { groupCommandeItems } from '../../../core/utils/order-item-grouper';
import { StatusBadgeComponent } from '../../../core/components/ui/status-badge/status-badge.component';

/**
 * Grouped order item line for card display.
 */
export interface GroupedCommandeItem {
  id: number;
  cocktailId: number;
  cocktailNom: string;
  varianteId?: number;
  varianteNom?: string;
  quantite: number;
  prixUnitaire: number;
  notes?: string;
}

/**
 * Encapsulates an order card displayed inside Kanban columns or list items.
 * Uses the modernized Barman card aesthetic (left accent status strip, clear typographic
 * hierarchy, urgency timers, notes highlight, and one-touch status advance action buttons).
 * Clicking on the card emits a view event to display order details in a modal.
 */
@Component({
  selector: 'app-commande-card',
  templateUrl: './commande-card.component.html',
  styleUrls: ['./commande-card.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    IonIcon, IonButton,
    CurrencyPipe, DatePipe, TranslocoPipe,
    StatusBadgeComponent,
  ],
})
export class CommandeCardComponent {
  @Input({ required: true }) commande!: Commande;
  @Input() showActions = true;

  @Output() updateStatus = new EventEmitter<{ commande: Commande; targetStatut: CommandeStatut }>();
  @Output() annuler = new EventEmitter<Commande>();
  @Output() view = new EventEmitter<Commande>();

  constructor(
    @Optional() private readonly modalCtrl?: ModalController,
    @Optional() private readonly translocoService?: TranslocoService,
  ) {
    addIcons({
      eye, banOutline, playOutline, checkmarkCircleOutline,
      checkmarkDoneOutline, timeOutline, alertCircleOutline,
      arrowForwardCircleOutline,
    });
  }

  /**
   * Groups identical items (same cocktail name, variante, and notes) and sums quantities.
   */
  get groupedItems(): GroupedCommandeItem[] {
    return groupCommandeItems(this.commande?.items) as GroupedCommandeItem[];
  }

  /**
   * Computes subtotal for a single grouped line item.
   */
  getItemLineTotal(item: GroupedCommandeItem): number {
    return (item.prixUnitaire || 0) * (item.quantite || 1);
  }

  /**
   * Calculates elapsed minutes since order creation.
   */
  getDelayMinutes(dateCommande: string | Date | undefined): number {
    if (!dateCommande) return 0;
    const start = new Date(dateCommande).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - start) / 60000));
  }

  /**
   * Convenience getter for delay in minutes.
   */
  get delayMinutes(): number {
    return this.getDelayMinutes(this.commande?.dateCommande);
  }

  /**
   * Formats elapsed delay into human-readable notation:
   * - '+24h' if delay is 24 hours or more
   * - 'XhYY' if delay is 1 hour or more
   * - 'Xm' if delay is less than 1 hour
   */
  get formattedDelay(): string {
    const minutes = this.delayMinutes;
    if (minutes <= 0) return '';
    const hours = Math.floor(minutes / 60);
    if (hours >= 24) {
      return '+24h';
    }
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h${String(remainingMinutes).padStart(2, '0')}`
        : `${hours}h`;
    }
    return `${minutes}m`;
  }

  /**
   * Whether the order exceeds critical delay thresholds (>= 15 min without service).
   */
  get isCritical(): boolean {
    if (!this.commande) return false;
    if (this.commande.statut === 'LIVREE' || this.commande.statut === 'REGLEE' || this.commande.statut === 'ANNULEE') {
      return false;
    }
    return this.delayMinutes >= 15;
  }

  /**
   * Whether the order is urgent (flagged prioritaire or waiting between 10 and 15 min).
   */
  get isUrgent(): boolean {
    if (!this.commande) return false;
    if (this.commande.statut === 'LIVREE' || this.commande.statut === 'REGLEE' || this.commande.statut === 'ANNULEE') {
      return false;
    }
    return this.isPriority() || (this.delayMinutes >= 10 && this.delayMinutes < 15);
  }

  /**
   * Whether the order requires attention (waiting between 5 and 10 min).
   */
  get isWarning(): boolean {
    if (!this.commande) return false;
    if (this.commande.statut === 'LIVREE' || this.commande.statut === 'REGLEE' || this.commande.statut === 'ANNULEE') {
      return false;
    }
    return this.delayMinutes >= 5 && this.delayMinutes < 10 && !this.isUrgent && !this.isCritical;
  }

  /**
   * Returns vertical status accent border color matching the Barman card design.
   */
  get lisereColor(): string {
    if (!this.commande) return 'var(--border-medium)';
    if (this.isCritical || this.isUrgent) return 'var(--semantic-danger)';
    if (this.isWarning) return 'var(--semantic-warning)';
    switch (this.commande.statut) {
      case 'EN_ATTENTE':
        return 'var(--semantic-warning)';
      case 'EN_PREPARATION':
        return 'var(--semantic-info)';
      case 'PRET':
        return 'var(--semantic-success)';
      case 'LIVREE':
      case 'REGLEE':
      case 'ANNULEE':
        return 'var(--text-muted)';
      default:
        return 'var(--border-medium)';
    }
  }

  /**
   * Human-readable table / tab / bar label for the order card header.
   */
  get tableLabel(): string {
    if (!this.commande) return '';
    if (this.commande.tableNumero && this.commande.barTabNom) {
      return `Table ${this.commande.tableNumero} • ${this.commande.barTabNom}`;
    }
    if (this.commande.tableNumero) {
      return `Table ${this.commande.tableNumero}`;
    }
    if (this.commande.barTabNom) {
      return `${this.commande.barTabNom} (Bar)`;
    }
    return 'Bar';
  }

  /**
   * Determines if the order has priority status based on flag, notes, or wait time.
   */
  isPriority(): boolean {
    if (!this.commande) return false;
    if (this.commande.prioritaire) return true;
    const delay = this.delayMinutes;
    const hasPriorityNote = this.commande.notes != null && (
      this.commande.notes.toLowerCase().includes('urg') ||
      this.commande.notes.toLowerCase().includes('retard') ||
      this.commande.notes.toLowerCase().includes('vip')
    );
    return (this.commande.statut === 'EN_ATTENTE' && delay > 10) || hasPriorityNote;
  }

  /**
   * Checks whether the current user is allowed to cancel this order.
   */
  peutAnnuler(): boolean {
    if (!this.commande) return false;
    return !['LIVREE', 'REGLEE', 'ANNULEE'].includes(this.commande.statut);
  }

  /**
   * Returns i18n translation key for the current order status.
   */
  getStatutLabelKey(): string {
    return `COMMANDES.STATUTS.${this.commande?.statut || 'EN_ATTENTE'}`;
  }

  /**
   * Emits view event to open order inspection modal.
   */
  onView(): void {
    this.view.emit(this.commande);
  }

  /**
   * Opens the confirmation dialog and cancels the order if confirmed.
   */
  async onAnnuler(event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    if (!this.modalCtrl) {
      this.annuler.emit(this.commande);
      return;
    }

    const modal = await this.modalCtrl.create({
      component: CancelOrderModalComponent,
      componentProps: {
        commande: this.commande,
      },
      cssClass: 'cancel-order-modal-dialog',
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' || data?.confirmed) {
      this.annuler.emit(this.commande);
    }
  }

  /**
   * Emits status transition event for the order.
   */
  onUpdateStatus(targetStatut: CommandeStatut, event?: Event): void {
    if (event) event.stopPropagation();
    this.updateStatus.emit({ commande: this.commande, targetStatut });
  }
}
